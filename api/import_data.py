'''
Download and convert CSVs into database friendly format

the data being used is:
- OpenStreetMap map street data
- QLD road census data
- national heavy vehicle rest stops
- QLD flood and fire maps
'''
import json
import asyncio
import asyncpg
import aiohttp
import datetime
import sys

settings = {}

# Read SQL Auth data
with open('settings.json') as json_file:
    settings = json.load(json_file)

DATA_TRAFFIC_CENSUS = [
    #2020
    "https://www.data.qld.gov.au/dataset/5d74e022-a302-4f40-a594-f1840c92f671/resource/1f52e522-7cb8-451c-b4c2-8467a087e883/download/trafficcensus2020.csv",
]

CREATE_ROAD_CENSUS_TABLE = """
CREATE TABLE IF NOT EXISTS CensusLocations (
    ID INTEGER PRIMARY KEY, -- Record ID
    SiteID INTEGER NOT NULL,
    Year SMALLINT NOT NULL,
    Location POINT NOT NULL,
    AADT INTEGER NOT NULL,
    PcntHV NUMERIC(5, 2)
);
"""

CREATE_ROAD_GEO_TABLE = """
CREATE TABLE IF NOT EXISTS Roads (
    ID INTEGER, -- OSM ID number
    ID_TYPE VARCHAR(10), -- OSM ID category
    HighwayType INTEGER NOT NULL,
    RouteRef INTEGER,
    Route POLYGON NOT NULL,
    PRIMARY KEY (ID, ID_TYPE)
);
"""

HIGHWAY_TYPES = {
    0: "Motorway",
    1: "Trunk",
    2: "Primary",
    3: "Secondary",
    4: "Tertiary"
}

'''
CSV Line reader.
'''
async def read_csv_by_line(url):
    async with aiohttp.ClientSession(raise_for_status=True) as session:
        keys = None
        async with session.get(url) as r:
            async for line in r.content:
                dataline = line.decode("utf-8").strip().split(',')
                if keys == None:
                    keys = dataline
                else:
                    data = dict(zip(keys,dataline))
                    yield data

'''
Imports road census data.

This data will later be used to generate a new table linking the road census and
roads table which will be read by the api.
'''
async def import_road_census_data(db):
    insert_row = """
        INSERT INTO CensusLocations
        (
            SiteID INTEGER NOT NULL,
            Year SMALLINT NOT NULL,
            Location POINT NOT NULL,
            AADT INTEGER NOT NULL,
            PcntHV NUMERIC(5, 2)
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5
        );
    """
    stmt = await db.prepare(insert_row)

    queue = []
    num = 1
    async with db.transaction():
        for url in DATA_TRAFFIC_CENSUS:
            async for data in read_csv_by_line(url):
                try:
                    args = [
                        data['SITE'],
                        2020,
                        f"POINT({data['LONGITUDE']} {data['LATITUDE']})",
                        data['AADT'],
                        data['PC_CLASS_0B'],
                    ]

                    queue.append(args)

                    if len(queue) >= 100:
                        await stmt.executemany(queue)
                        queue = []
                except:
                    print(f"Insert failed")

                sys.stdout.write("\r Processing record: %i" % num)
                sys.stdout.flush()
                num += 1

    print(f"Inserted all census data")

'''
Import roads
'''
async def import_roads(db):
    insert_row = """
        INSERT INTO Roads
        (
            ID INTEGER, -- OSM ID number
            ID_TYPE VARCHAR(10), -- OSM ID category
            HighwayType INTEGER NOT NULL,
            RouteRef INTEGER,
            Route POLYGON NOT NULL
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5
        );
    """
    stmt = await db.prepare(insert_row)

    queue = []
    num = 1
    async with db.transaction():
        async with session.get(settings['osm_data_location']) as r:
            geojson = await r.json()

            for feature in geojson['features']:
                if 'highway' in feature['properties']:
                    polygon = ",".join([f"({x[0]}, {x[1]})" for x in feature['geometry']['coordinates']])
                    try:
                        args = [
                            feature['id'].split('')[1],
                            feature['id'].split('')[0],
                            feature['properties']['highway'],
                            int(feature['properties']['ref']),
                            f"POLYGON({polygon})",
                        ]

                        queue.append(args)

                        if len(queue) >= 100:
                            await stmt.executemany(queue)
                            queue = []
                    except:
                        print(f"Insert failed")

                    sys.stdout.write("\r Processing record: %i" % num)
                    sys.stdout.flush()
                    num += 1

    print(f"Inserted all road data")

async def run():
    db = await asyncpg.connect(user=settings['psql_user'], password=settings['psql_pass'],
        database=settings['psql_dbname'], host=settings['psql_host'])

    await db.execute(CREATE_CRASH_LOCATIONS_TABLE)
    await db.execute(CREATE_ROAD_CENSUS_TABLE)

    await import_road_census_data(db)
    await import_roads(db)

loop = asyncio.get_event_loop()
loop.run_until_complete(run())
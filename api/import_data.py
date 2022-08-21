'''
Download and convert CSVs into database friendly format

the data being used is:
- OpenStreetMap map street data
- QLD road census data
- national heavy vehicle rest stops
- QLD flood and fire maps
'''
import json
import aiofiles
import asyncio
import asyncpg
import aiohttp
import datetime
import sys

import shapely.geometry
import shapely.wkb
from shapely.geometry.base import BaseGeometry
from shapely.geometry import Point, LineString

settings = {}

# Read SQL Auth data
with open('settings.json') as json_file:
    settings = json.load(json_file)

DATA_TRAFFIC_CENSUS = [
    #2020
    "https://www.data.qld.gov.au/dataset/5d74e022-a302-4f40-a594-f1840c92f671/resource/1f52e522-7cb8-451c-b4c2-8467a087e883/download/trafficcensus2020.csv",
]

DATA_REST_STOPS = ""

CREATE_ROAD_CENSUS_TABLE = """
CREATE TABLE IF NOT EXISTS CensusLocations (
    ID SERIAL PRIMARY KEY, -- Record ID
    SiteID INTEGER NOT NULL,
    Year SMALLINT NOT NULL,
    Location GEOMETRY NOT NULL,
    AADT REAL NOT NULL,
    PcntHV NUMERIC(5, 2)
);
"""

CREATE_ROAD_GEO_TABLE = """
CREATE TABLE IF NOT EXISTS Roads (
    ID INTEGER, -- OSM ID number
    ID_TYPE VARCHAR(10), -- OSM ID category
    HighwayType INTEGER NOT NULL,
    RouteRef VARCHAR(255),
    Route GEOMETRY NOT NULL,
    PRIMARY KEY (ID, ID_TYPE)
);
"""

HIGHWAY_TYPES = {
    "motorway": 0,
    "trunk": 1,
    "primary": 2,
    "secondary": 3,
    "tertiary": 4
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
            SiteID,
            Year,
            Location,
            AADT,
            PcntHV
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
                        int(data['SITE']),
                        2020,
                        Point(float(data['LONGITUDE']), float(data['LATITUDE'])).wkt,
                        float(data['AADT']),
                        len(data['PC_CLASS_0B']) > 0 and float(data['PC_CLASS_0B']) or None,
                    ]

                    queue.append(args)

                    if len(queue) >= 100:
                        await stmt.executemany(queue)
                        queue = []

                    sys.stdout.write("\r Processing record: %i" % num)
                    sys.stdout.flush()
                    num += 1
                except ValueError:
                    pass
                except Exception as e:
                    print(data)
                    raise e

    print(f"Inserted all census data")

'''
Import roads
'''
async def import_roads(db):
    insert_row = """
        INSERT INTO Roads
        (
            ID, -- OSM ID number
            ID_TYPE, -- OSM ID category
            HighwayType,
            RouteRef,
            Route
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
        async with aiohttp.ClientSession(raise_for_status=True) as session:
            async with aiofiles.open(settings['osm_data_location'], mode='r', encoding="utf8") as f:
                geojson = json.loads(await f.read())

                for feature in geojson['features']:
                    if 'highway' in feature['properties']:
                        polygon = [Point(x[0], x[1]) for x in feature['geometry']['coordinates']]

                        args = [
                            int(feature['id'].split('/')[1]),
                            feature['id'].split('/')[0],
                            HIGHWAY_TYPES[feature['properties']['highway'].lower()],
                            'ref' in feature['properties'] and feature['properties']['ref'] or None,
                            LineString(polygon).wkt,
                        ]

                        queue.append(args)

                        if len(queue) >= 100:
                            await stmt.executemany(queue)
                            queue = []

                        sys.stdout.write("\r Processing record: %i" % num)
                        sys.stdout.flush()
                        num += 1

    print(f"Inserted all road data")

async def run():
    async def init_connection(conn):
        def encode_geometry(geometry):
            if not hasattr(geometry, '__geo_interface__'):
                raise TypeError('{g} does not conform to '
                                'the geo interface'.format(g=geometry))
            shape = shapely.geometry.asShape(geometry)
            return shapely.wkb.dumps(shape)

        def decode_geometry(wkb):
            return shapely.wkb.loads(wkb)

        await conn.set_type_codec(
            'geography',
            encoder=encode_geometry,
            decoder=decode_geometry,
            format='binary',
        )

    pool = await asyncpg.create_pool(user=settings['psql_user'], password=settings['psql_pass'],
        database=settings['psql_dbname'], host=settings['psql_host'], init=init_connection)

    async with pool.acquire() as db:
        await db.execute(CREATE_ROAD_CENSUS_TABLE)
        await db.execute(CREATE_ROAD_GEO_TABLE)

        await import_road_census_data(db)
        await import_roads(db)

loop = asyncio.get_event_loop()
loop.run_until_complete(run())
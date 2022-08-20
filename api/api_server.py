import asyncio
import asyncpg
import json
from aiohttp import web

settings = {}

with open('settings.json') as json_file:
    settings = json.load(json_file)

class Webserver:
    def __init__(self, pool, loop):
        self.pool = pool
        self.loop = loop

    '''
    Returns a loadable GeoJSON file given the corners of the user's monitor

    Request format:
    {
        "corner1": [long, lat],
        "corner2": [long, lat],
    }
    '''
    async def list_roads(self, request):
        request_json = await request.json()

        sql = """
        SELECT ID, ID_TYPE, HighwayType, RouteRef, Route
        FROM Roads
        {}
        ORDER BY HighwayType ASC
        LIMIT 1000
        """

        # List of tuples, with first value being the SQL, second being a list of arguments
        conditions = []

        # Boundaries
        if 'corner1' in request_json and 'corner2' in request_json:
            envelope = "ST_MakeEnvelope({}, {}, {}, {}, srid=4283)"
            corners = [request_json['corner1'][0], request_json['corner1'][1],
                    request_json['corner2'][0], request_json['corner2'][1]]
            conditions.append(
                (f"ST_Overlaps({envelope}, Route::geometry) OR ST_Contains({envelope}, Route::geometry)",
                    [*corners, *corners]))

        # Code to insert conditions and the required $1, $2 etc format.
        conditions_compiled = "\nAND ".join([c[0] for c in conditions])

        current_var = 1
        condition_variables = []
        for condition in conditions:
            condition_variables.extend(condition[1])
            current_var += len(condition[1])

        conditions_compiled = conditions_compiled.format(*[f'${n}' for n in range(1, current_var)])

        sql = sql.format(conditions_compiled and "WHERE " + conditions_compiled or ' ')

        # Debugging
        print(condition_variables)
        print(conditions)
        print(conditions_compiled)
        print(sql)

        async with self.pool.acquire() as con:
            results = await con.fetch(sql, *condition_variables)

        #  Create GeoJson
        geojson = {
          "type": "FeatureCollection",
          "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
          "features": [],
        }

        for result in results:
            geojson[features].append({
                  "type": "Feature",
                  "properties": {
                    "@id": f"{result['ID_TYPE']}/{result['ID']}",
                  },
                  "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                      result["Route"]
                    ]
                  },
                  "id": f"{result['ID_TYPE']}/{result['ID']}"
                })
            result = dict(result)
            result['location'] = (result['location'].x, result['location'].y)
            parse_to_json.append(result)

        return web.json_response(parse_to_json, status=200)

    '''
    Returns a GeoJSON response containing all rest stops within the viewing area

    Request format:
    {
        "corner1": [long, lat],
        "corner2": [long, lat],
    }
    '''
    async def get_rest_stops(self, request):
        pass

    '''
    Build the web server and setup routes
    '''
    async def build_server(self, address, port):
        app = web.Application(loop=self.loop)
        app.router.add_route('POST', "/list_roads", self.list_roads)
        app.router.add_route('POST', "/get_rest_stops", self.get_rest_stops)

        return await self.loop.create_server(app.make_handler(), address, port)

async def start_webserver(loop):
    pool = await asyncpg.create_pool(user=settings['psql_user'], password=settings['psql_pass'],
        database=settings['psql_dbname'], host=settings['psql_host'])

    webserver = Webserver(pool, loop)
    await webserver.build_server('localhost', 9999)

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    loop.run_until_complete(start_webserver(loop))
    print("Server ready!")

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print("Shutting Down!")
        loop.close()
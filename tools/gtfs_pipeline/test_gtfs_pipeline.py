import json
import tempfile
import unittest
from pathlib import Path

from gtfs_pipeline import write_outputs


class IndexPlatformsTest(unittest.TestCase):
    def test_platforms_are_preserved_per_pattern_and_occurrence(self):
        def stop(station, platform, lat):
            return {"id": station, "name": station, "platformId": platform,
                    "coord": {"lat": lat, "lng": 10}}

        a = stop("station-a", "platform-a", 1)
        b1 = stop("station-b", "platform-b1", 2)
        b2 = stop("station-b", "platform-b2", 3)
        lines = [{
            "type": "bus", "line": "1", "agency": "Test", "name": "Test",
            "directions": [{
                "direction": "0", "headsign": "Test", "schedule": [],
                "stops": [a, b1, a, b2],
                "variants": [{"schedule": [], "stops": [a, b2]}],
            }],
        }]
        with tempfile.TemporaryDirectory() as output:
            write_outputs({"outputDir": Path(output)}, lines, {}, set(), {})
            index = json.loads((Path(output) / "index.json").read_text(encoding="utf-8"))

        direction = index["lines"][0]["dirs"][0]
        self.assertEqual(direction["seq"], [["station-a", "station-b", "station-a", "station-b"],
                                             ["station-a", "station-b"]])
        self.assertEqual(direction["plat"], [["platform-a", "platform-b1", "platform-a", "platform-b2"],
                                              ["platform-a", "platform-b2"]])
        self.assertEqual(index["platforms"]["platform-b1"]["la"], 2)
        self.assertEqual(index["platforms"]["platform-b2"]["la"], 3)


if __name__ == "__main__":
    unittest.main()

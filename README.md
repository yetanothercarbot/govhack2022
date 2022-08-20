# FreightRelocate by Milk Is Optional
## GovHack 2022 Submission
This is a GovHack 2022 submission, primarily targetted at the [flood, fire and the future: the road to resilience](https://2022.hackerspace.govhack.org/challenges/flood_fire_and_the_future_the_road_to_resilience) challenge. We created a data visualisation tool, with the idea that future expansions would make this an indispensable tool for freight companies. 

The project consists of a map, with various layers such as historical flood data, regions at risk of being affected by bushfires and routes appropriate for heavy vehicles. 

## Proof of Concept Limitations
We had to narrow the scope for the proof of concept, due to the limited time and manpower (team of 2).
- For the proof of concept, only Queensland data was used, for ease of development. In a real product, the entirety of Australia would naturally be considered.
- Bushfire data is currently not included - we located a dataset which describes areas at risk of bushfires. The dataset for the entirety of Qld is approximately 15GB; it would require more processing to bring it to a manageable size.

## Future Improvements
- Allow users to enter (and store) routes. This tool could then show which sections of the route are most at-risk and how long detours would take. 
- Show auxillary information - routing should take rest stop locations into account, for instance, and the estimated cost for each detour. For in-progress routes, the vehicle's current locations could be super-imposed.
- Use data from the Bureau of Meteorology to show routes which could potentially be affected within the next 24 hours.
- Use data from emergency services and local councils to show which routes are being affected *right now*. 
- Based on the three previous dot points, it can prioritise routes that need to be reviewed based on urgency, risk and importance.

# App Type
This is an application which generates toolpaths for incremental sheet forming based on interactive inputs to produce a scale model of a sheet formed coffee table. It includes a simulation for evolving the input mesh to meet target points for legs, and evolves the surface and the leg positions to maximize stiffness and stability while keeping the form manufacturable with a single-point tool.

## user inputs
1. User can load an OBJ and pick the formable face by clicking it in the view or from a list. The rest of the plate stays flat as the table top. The formable face is assumed flat, horizontal and convex; the app warns when it isn't.
2. User can set the level of mesh subdivision of the formed surface using target edge length in mm, default is 5mm.
3. User can set the sheet material and thickness, default is AL 1100-O at 0.8mm. Each material has a stiffness and a density.
4. User can set the size of the edge bevel, default is 5mm (5mm in, 5mm down, at 45 degrees). 0 turns it off.
5. User can specify the number of target points and their distance below the input mesh which will become the contact points with the floor, as well as their minimum distance to each other. Defaults are 4 legs, 50mm deep, 80mm apart.
6. User can set the stability weight, which trades stiffness against resistance to tipping, default is 1. 0 means stiffness only.
7. User can set maximum face normal angle from flat, default is 45 degrees.
8. User can set minimum face normal angle from flat, default is 10 degrees, and the flat facet penalty, default is 4. 0 turns the penalty off.
9. User can set the test load in N, default is 20N, and select which faces carry it. Faces are toggled by clicking them in the view in load-pick mode; the default is every face except the formable one (the flat top).
10. User can set the analysis resolution for the stiffness simulation, default is 18mm.

## constraints
A design is only valid when all of these hold. Invalid designs are ranked by how far they miss.
1. No pleat face is steeper than the maximum angle from flat. The bevel is fixed at 45 degrees and is exempt.
2. No face lies flat against the floor. Only edges and vertices may touch the floor (a face counts as flat on the floor when all three corners are within 1mm of it).
3. The table stands on its own: its center of mass lies inside the convex hull of the legs.
4. Legs stay inside the formable face, inside the bevel, and no closer to each other than the minimum distance (or closer than they already were, if the leg stage could not reach the minimum).

## simulation guidelines
1. Every forming starts with a 45 degree bevel around the perimeter of the formable face, going in and down by the bevel size. All pleats, fold points and legs sit inside the bevel.
2. Target points self organize to maximize their distance from the bevel's inner boundary in the x,y while maintaining the user specified distance from each other.
3. The mesh creates triangulated pleats to connect the boundary with the target points, while maintaining surface normal angles within the maximum angle from flat. Starting designs raise a fold point inside any face that would lie flat on the floor.
4. The application features an evolver which tests options for the pleats (boundary anchors, fold points, edge flips) and for the leg positions. It ranks valid designs by a cost that combines:
   - stiffness: compliance under the test load on the selected faces, from a bar-and-hinge model with the legs fixed;
   - stability: the tip-over load, i.e. the point load on the worst spot of the top that tips the table, as a multiple of its own weight (lever rule over each edge of the legs' convex hull), raised to the stability weight;
   - flatness: the share of pleat area flatter than the minimum angle, weighted by how far short each face is, times the flat facet penalty. Near-flat faces form poorly with single point forming.

   cost = compliance / tipRatio^stability weight * (1 + flat facet penalty * flatness)
5. The evolver moves legs, raises fold points out of faces flat on the floor, and collapses near-flat faces by removing the fold point or edge anchor that creates them (or flipping an edge when neither exists).
6. Readouts show stiffness, steepest face, floor contact, near-flat faces, max deflection, compliance, tip-over load, stability margin, leg clearance and spacing. The slope view highlights faces over the limit or flat on the floor, and dims near-flat faces.

## toolpath generation
1. The app generates a spiral tool path from the boundary towards the low points at a user specified vertical contour height, default is 0.5mm. It starts with the bevel. The tool is ball end, default radius 5mm, and the feed rate defaults to 2000mm/min.
2. Connect islands per layer with a jog path with a user specified height, default is 100mm.
3. Do not connect contours together with lines which intersect the mesh.
4. Add an export which outputs a .csv with this format for the toolpath from the points of the toolpath: index,x,y,z,move
5. Export G-code with Z0 at the top of the sheet and Z negative into the sheet. The header records the material, legs, depth, max angle and bevel. Also export the formed mesh as OBJ and the settings (including load faces and evolved leg positions) as JSON.

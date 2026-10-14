# SheetFormer wrist study

Local first-pass prototype for Wednesday's 12 × 12 inch sheet-forming exercise. It follows the class sequence of selecting a formable face, refining the mesh, moving a target below the sheet, inspecting an angle limit, previewing descending contours, and exporting OBJ/CSV.

Run on this Mac:

```sh
cd "/Users/crisnevelits/Desktop/sci-arc/3GA/REHM/CODE/CLAUDE/projects/project1Code/apps/sheetformer"
npm run dev
```

Open `http://127.0.0.1:5173/apps/sheetformer/`. No packages need installing.

The project loads `references/3D/HAND_clean_mesh.obj` as a visual wrist reference and reads the supplied `references/3D/basePlate.obj` to set the 304.8 mm square sheet and 57.4 mm flat clamping inset. The base OBJ is a flat reference: the exported formed sheet is still a separate design-preview mesh, not a modification of the source OBJ. The Houdini hand OBJ has no declared unit, so the display scale is **only a starting guess**. Measure and confirm scale and relative placement before drawing fabrication conclusions.

This first version uses one adjustable smooth depression and contour-loop preview. It does **not** yet implement the professor's self-organizing points, triangulated pleat evolver, stiffness search, a true continuous spiral, or collision validation. The exported surface is open, and the CSV is **not robot-ready**. Review the formed shape, material, fixture, tool, coordinate frame, and path with the instructor before running the robot.

The instructor's uploaded `SheetFormer.html` and `SheetFormer.md` (in Downloads) are the reference implementation. This preview matches their CSV header and `move` labels (`jog`, `plunge`, `feed`), with Z0 at the top of the sheet and negative Z into it. It does **not** reproduce the sample's ball-tool compensation, collision checks, or table-leg stiffness/stability optimisation.

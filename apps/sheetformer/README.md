# SheetFormer wrist study

Local first-pass prototype for Wednesday's 12 × 12 inch sheet-forming exercise. It follows the class sequence of selecting a formable face, refining the mesh, moving a target below the sheet, inspecting an angle limit, previewing descending contours, and exporting OBJ/CSV.

Run on this Mac:

```sh
cd "/Users/crisnevelits/Desktop/sci-arc/3GA/REHM/CODE/CLAUDE/projects/project1Code/apps/sheetformer"
npm run dev
```

Open `http://127.0.0.1:5173/apps/sheetformer/`. No packages need installing.

The project loads the complete `references/3D/HAND_clean_mesh.obj` as a visual hand and wrist reference and retains `references/3D/basePlate.obj` as the class 304.8 mm base-sheet reference. The Houdini OBJ has no declared unit, so the default 25.4 mm/unit display scale is **only a starting guess**. Measure and confirm scale and relative placement before drawing fabrication conclusions.

The Fold language selector switches between a static, piecewise-planar pleat study and the original smooth depression at the same dimensions. The pleated mode draws its crease network and dims the toolpath overlay so the facets are easier to inspect. This is **not** the professor's self-organizing triangulated pleat evolver, stiffness search, a true continuous spiral, or collision validation. The exported surface is open, and the CSV is **not robot-ready**. Review the formed shape, material, fixture, tool, coordinate frame, and path with the instructor before running the robot.

The instructor's uploaded `SheetFormer.html` and `SheetFormer.md` (in Downloads) are the reference implementation. This preview matches their CSV header and `move` labels (`jog`, `plunge`, `feed`), with Z0 at the top of the sheet and negative Z into it. It does **not** reproduce the sample's ball-tool compensation, collision checks, or table-leg stiffness/stability optimisation.

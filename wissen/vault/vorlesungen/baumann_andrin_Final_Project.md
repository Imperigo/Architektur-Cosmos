---
titel: "baumann_andrin_Final_Project"
quelle: "Studium Andrin (HSLU/ETH)"
datei: "baumann_andrin_Final_Project.pdf"
seiten: 1
ocr-seiten: 0
tags: [bauwissen, vorlesung]
---

# baumann_andrin_Final_Project

## S. 1

Coding Architecture 1 | HS24
Baumann Andrin
 TWISTer
Geometry
A cylinder as a basic form, as a monolithic monument in 
the neighbourhood in Altstetten. As a twist in the form, 
the volume is rotated and warped. A clear standard floor 
and a raised ground floor indicate a public programme on 
the ground floor and a mixed use of living and working on 
the upper standard floors
Structure
A slab-column construction as a static structure was de­
fined by the course programme and can be changed in 
length, width and height within a few seconds. This sim­
plifies adaptations and variants.
Facade
The façade elements are turned in a horizontal direction, 
as a building feature facing outwards. They can be chan­
ged adaptively depending on the position of the sun and 
create shade for the lower storey. The building breathes.
Code Basics
1. Sculpting the Building Using a Filter (BrepFilter) => This is the first step, where the filter is applied to shape the building grid by excluding unwanted volumes.
2. Generating Architectural Elements (Columns, Beams, Slabs, Facades) => Parallel to applying the filter, the structural elements like columns, beams, slabs, and facades 
are generated dynamically.
3. BuildingGrid Class (Central Management of Elements) => The BuildingGrid class combines the filter, the grid structure, and element generation into a unified framework.
4. Final Step: Create the Building => This part of the code executes the creation of the building by combining all elements and applying transformations.
5. Attractor-Based Adjustments (Optional Enhancement) => 
This optional step adds dynamic variations to the facade walls based on their distance from an attractor curve.
Snippets of Code :)
1.
2.
3.
4.
5.

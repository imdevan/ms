# How to use this document (AGENT)

Read before executing your task, read through the  `# Updates` at the END of this document. To understand what work has already been implemented.

Execute each task in order. 

Create sub tasks if additional work is needed to execute a given parent task

Track your token usage. As you reach the maximum (5 free credits) be sure to track the work you have done and what your next steps would have been had you not run out of tokens. 

Store updates you implement at the END of this document in `# Updates`

# v2.1.0

- [x] 1 Toggle side-by-side
  ui
    - icon button in the header
    - add to the side bar settings display as well
    - split creates a 50% view split
    - with recipe on the left side and notes on the right side
    - drag and drop (similar to item drag and drop)
      - swap sides
      - clickable area between the two can be used to resize both sides simultaneously
      - if so save to local state  

- [x] 2 keep recipe scale  and side-by-side button icon in header at all times regardless or screen size

- [x] 3 query enhancements 
  accept query via url
  example: `devan.gg/meassuring-spoon?q={/*any content the user would have pasted via clipboard}`
  same as copying and pasting value into input box

- [ ] 4 accept url as query 
  example: `devan.gg/meassuring-spoon?q=recipe_url`

- [ ] 5 Add section under notes to show the link to the source


- [ ] 6 unit converter update
  - click on left unit to be able to change which the current unit that is being converted

  Alternative: have the left be scrollable like the right is. But only the unit not the value

  
# Updates

## Task 1 - Toggle side-by-side (COMPLETED)
- Added split view toggle button to Header (PanelLeft icon)
- Added split view toggle to SideMenu settings
- Implemented ResizablePanelGroup with recipe panel on left, notes on right
- Added swap button to switch panel positions
- Persisted splitView and panelOrder to localStorage
- Split view only shows on desktop (not mobile)

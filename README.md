# Statespace
**Plugin to generate state-space visualizations**

Display a [JSON](https://www.json.org) statespace from a file, currently generated by [Web-Planner](https://web-planner.herokuapp.com), as a [D3.js](https://d3js.org) interactive graph.
Supports both cartesian and radial layouts, with animations during layout change.
Hover nodes and links with mouse to see state and action information, respectively.
Click nodes to collapse or expand the graph.
Click and drag background to move graph, and use scroll wheel to zoom in and out.

## Statespace JSON
A complete JSON for a trivial Hanoi problem looks like the following:
```json
{
  "name":  "initial state",
  "color": "#0000FF",
  "state": "111111",
  "children": [
    {
      "name":  "state 1",
      "color": "#0000FF",
      "state": "11000011110",
      "children": [],
      "action": "move(d1 d2 peg2)"
    },
    {
      "name":  "goal state",
      "color": "#FF0000",
      "state": "10001011101",
      "children": [],
      "action": "move(d1 d2 peg3)"
    }
  ],
  "predicates": [
    "clear peg2",
    "clear peg3",
    "clear d1",
    "on d3 peg1",
    "on d2 d3",
    "on d1 d2",
    "on d1 peg3",
    "on d1 peg1",
    "clear peg1",
    "on d1 peg2",
    "clear d2",
    "clear d3",
    "on d1 d3",
    "on d2 peg1",
    "on d2 peg2",
    "on d2 peg3",
    "on d3 peg2",
    "on d3 peg3"
  ]
}
```

In this example we start from the root node ``initial state`` and explore two states, children from the ``initial state``.
One of such states is ``state 1`` and it does not meet the requirements to be a goal state, and is obtained by action ``move(d1 d2 peg2)`` applied to ``initial state``.
The other state does meet the requirements to be ``goal state`` applying ``move(d1 d2 peg3)`` to ``initial state``.
This example contains a very small JSON, remove spaces to obtain smaller files and better response times.

Each node contains a:

- ``name``: string - at most one node must be ``"goal state"`` for the implementation to recognize this node as the goal state to generate a bold path, otherwise no path is highlighted. Other nodes can have any name.
- ``color`` color string - optional secondary notation to show the distance between current and goal state.
    - Color gradient from blue (far from goal) to red (goal)
- ``state``: bit string or string array
    - each char set to "1" represent a predicate from ``predicates`` at the same index that is true in a state. Leading zeros can be omitted.
    - each string in the array represents part of the state: ``["(at agent home)", "(happy agent)"]``. This representation leads to bigger files.
- ``children``: array of nodes - array can be empty
- ``action``: string - name of action that generated this state, does not exist for the initial state.

All nodes share the same ``predicates``, a list of fluent predicates used to display description of each state.
Rigid predicates are not stored as they never change during planning.

Web-Planner uses breadth-first search and will ignore a previously visited state, which explains why some children may appear to be missing from the statespace.

## References
For more information see our paper [WEB PLANNER: A Tool to Develop Classical Planning Domains and Visualize Heuristic State-Space Search](http://icaps17.icaps-conference.org/workshops/UISP/uisp17proceedings.pdf#page=36)
```bibtex
@inproceedings{magnaguagno2017web,
  title={WEB PLANNER: A tool to develop classical planning domains and visualize heuristic state-space search},
  author={Magnaguagno, Maur{\'i}cio C. and Pereira, Ramon Fraga and M{\'o}re, Martin D. and Meneguzzi, Felipe},
  booktitle={Proceedings of the Workshop on User Interfaces and Scheduling and Planning, UISP},
  pages={32--38},
  year={2017}
}
```

Statespace is based on two D3.js examples:

- [Radial Reingold-Tilford Tree](https://bl.ocks.org/mbostock/4063550)
- [Cartesian Reingold-Tilford Tree with interactive functions](https://bl.ocks.org/robschmuecker/7880033)

## ToDo's
- Improve documentation
- More compact state representation with hex string instead of binary
- Import/Export JSON files
- Optional name and color properties
- Generate color with user specified gradient (replace color with distance value)
- Generate Dovetail from root to specified node (requires new JS Dovetail implementation and bridge plugin)
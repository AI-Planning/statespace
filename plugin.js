/* global $ */
var viewerWidth, viewerHeight,
    layout = true, // cartesian: true, radial: false
    maxLabelLength = 130,
    deg2rad = Math.PI / 180,
    root, tree, svgGroup, diagonal, treeHeight, stateCounter,
    zoomListener,
    loaded = false,
    tooltip,
    svg;

function updateLayout(layoutType) {
    if(layoutType) {
        // Compute new height, function counts total children of root node and sets tree height accordingly
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        var levelWidth = [1];
        var childCount = function(level, n) {
            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= ++level) levelWidth.push(n.children.length);
                else levelWidth[level] += n.children.length
                n.children.forEach(function(d) { childCount(level, d); });
            } else if (n._children && n._children.length > 0) {
                if (levelWidth.length <= ++level) levelWidth.push(n._children.length);
                else levelWidth[level] += n._children.length
                n._children.forEach(function(d) { childCount(level, d); });
            }
        };
        childCount(0, root);
        tree.size([d3.max(levelWidth) * 50, viewerWidth])
        .separation(function(a, b) { return a.parent === b.parent ? 1 : 2});
        diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
    } else {
        tree.size([360, 360])
        .separation(function(a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; });
        diagonal = d3.svg.diagonal.radial().projection(function(d) { return [d.y, d.x * deg2rad]; });
    }
}

// Function to center node when clicked/dropped so node does not get lost when collapsing/moving with large amount of children
function centerNode(source) {
    var scale = zoomListener.scale();
    var x = viewerWidth / 2 - source.y0 * scale;
    var y = viewerHeight / 2 - (layout ? source.x0 * scale : 0);
    d3.select("g").transition()
        .duration(750)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
}

// Uncompress state information to a string description
function description(state) {
    var descr = "", size = state.length - 1;
    for (var i = size; i >= 0; --i) {
        if (state[i] === "1") {
            descr += "<br>" + root.predicates[size - i];
        }
    }
    return descr;
}

function update(source, setup) {
    // Compute new tree layout
    var nodes = tree.nodes(root),
        links = tree.links(nodes);

    // Set widths between levels based on maxLabelLength
    nodes.forEach(function(d) {
        if (d.depth > treeHeight) treeHeight = d.depth;
        d.y = d.depth * maxLabelLength;
        if (d.name === "goal state")
        {
            while (d !== root) {
              d.path = true;
              d = d.parent;
            }
        }
    });

    // Update nodes
    var node = svgGroup.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++stateCounter); });

    if (setup) {
        // Enter any new nodes at previous position of parent
        node.enter().append("g")
            .attr("class", "node")
            .attr("transform", "translate(" + source.y0 + "," + source.x0 + ")")
            // Toggle children on click
            .on("click", function(d) {
                if (d3.event.defaultPrevented) return; // click suppressed
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
                update(d, false);
            })
            // Show tooltip
            .on("mouseover", function(d) {
                tooltip.html(d.name + description(d.state))
                .style("left", (d3.event.pageX + 20) + "px")
                .style("top", (d3.event.pageY - 30) + "px")
                .style("opacity", .95);
            })
            // Hide tooltip
            .on("mouseout", function(d) { tooltip.style("opacity", 0); });

        // Change circle fill depending on whether it has children and is collapsed
        node.append("circle")
            .attr("r", 8)
            .style("fill", function(d) { return d.color });

        node.append("text")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("y", -10)
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; });
    }

    // Transition nodes to their new position
    node.transition()
        .duration(750)
        .attr("transform", layout ?
            function(d) { return "translate(" + d.y + "," + d.x + ")"; } :
            function(d) { return "rotate(" + (d.x ? (d.x - 90) : 0) + ")translate(" + d.y + ")"; }
        )
        .attr("display", "inline")
        .select("circle")
        .style("stroke", function(d) { return d._children ? "#0f0" : "#000"; });

    // Transition exiting nodes to new position of parent
    node.exit().transition()
        .duration(750)
        .attr("transform", "translate(" + source.y + "," + source.x + ")")
        .attr("display", "none");

    // Update links
    var link = svgGroup.selectAll("path")
        .data(links, function(d) { return d.target.id; });

    // Enter any new links at previous position of parent
    var o = {x: source.x0, y: source.y0};
    link.enter().insert("path", "g")
        .style("fill", "none")
        .style("stroke", function(d) { return d.target.color; })
        .style("stroke-width", function(d) { return d.target.path ? 5 : 1.5 })
        .attr("d", diagonal({source: o, target: o}))
        // Show tooltip
        .on("mouseover", function(d) {
            tooltip.html(d.target.action + "<br>" + d.source.name + " &#8658; " + d.target.name)
            .style("left", (d3.event.pageX + 20) + "px")
            .style("top", (d3.event.pageY - 30) + "px")
            .style("opacity", .95);
        })
        // Hide tooltip
        .on("mouseout", function(d) { tooltip.style("opacity", 0); });

    // Transition links to their new position
    link.transition()
        .duration(750)
        .attr("d", diagonal);

    // Transition exiting nodes to new position of parent
    var o = {x: source.x, y: source.y};
    link.exit().transition()
        .duration(750)
        .attr("d", diagonal({source: o, target: o}))
        .remove();

    // Stash old positions for transition
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    centerNode(source);
}

// Load JSON data into svg
function load(jsonData, svg)
{
    tree = d3.layout.tree();
    svgGroup = svg;

    stateCounter = treeHeight = 0;

    root = jsonData;
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    updateLayout(layout);
    update(root, true);
    loaded = true;
    document.getElementById("hv-output").innerHTML = "Visited States: " + stateCounter + "<br>Tree Height: " + treeHeight;
}

function changeLayout() {
    if(!loaded) return;
    layout = !layout;
    updateLayout(layout);
    update(root, false);
}

function clearSvg(x, y)
{
    svg.selectAll("g").remove();
    svgGroup = svg.append("g");
    zoomListener.scale(1);
    zoomListener.translate([x, y]);
}

function ShowStatespace() {
    var domText = window.ace.edit($('#domainSelection').find(':selected').val()).getSession().getValue();
    var probText = window.ace.edit($('#problemSelection').find(':selected').val()).getSession().getValue();

    $('#chooseFilesModal').modal('toggle');
    $('#plannerURLInput').show();
    window.toastr.info('Generating Statespace...');

    $.ajax({type: "POST",
            url: "https://web-planner.herokuapp.com/graph",
            data: {domain: domText, problem: probText}
        })
        .done(function (res) {
            if(res.error) {
                window.toastr.error('Problem with the server.');
                console.log(res.error);
            } else {
                window.toastr.success('Statespace complete!');
                updateHTML(res);
            }
        })
        .fail(function (res) {
            window.toastr.error('Error: Malformed URL?');
        });
}

function updateHTML(output) {
    if (!window.statespace) {
        window.new_tab('Statespace', function(editor_name) {
            window.statespace = output;
            var plan_html = '<div class=\"plan-display\">\n';
            plan_html += '<h2>Statespace</h2>\n';
            plan_html += '<button onclick="changeLayout()" style="float:right">Change Layout</button>\n'
            plan_html += '<p id="hv-output"></p>\n';
            plan_html += '<pre id="svg-container" style="background-color:white;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;width:80vw;height:75vh"></pre>';

            // Define the zoomListener which calls the function on the "zoom" event constrained within the scaleExtents
            zoomListener = d3.behavior.zoom().scaleExtent([0.05, 3]).on("zoom", function() {
              svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            });

            $('#' + editor_name).html(plan_html);
            svg = d3.select("#svg-container").append("svg")
              .attr("width","100%")
              .attr("height", "100%")
              .attr("preserveAspectRatio", "xMinYMid meet")
              .attr("display", "block")
              .call(zoomListener);
            tooltip = d3.select("body").append("div")
              .attr("class", "tooltip")
              .style("opacity", 0);
            var svg_container = $("#svg-container");
            viewerWidth = svg_container.width();
            viewerHeight = svg_container.height();
        });
    }
    clearSvg(viewerWidth / 2, viewerHeight / 2);
    load(output, svgGroup);
}

define(function () {
    // Store statespaces
    window.statespace;
    window.d3_loaded = false;

    return {
        name: 'Statespace',
        author: 'Mau Magnaguagno',
        email: 'mauricio.magnaguagno@acad.pucrs.br',
        description: 'TODO',

        // This will be called whenever the plugin is loaded or enabled
        initialize: function() {

            if (!(window.d3_loaded)) {
                // Load D3
                requirejs(['https://d3js.org/d3.v3.min.js'], function() {window.d3_loaded = true;});
                // Load node and tooltip style
                var style = document.createElement('style');
                style.innerHTML = '.node { cursor:pointer } .node circle { stroke-width:1.5px } .node text { font:10px sans-serif }' +
                'div.tooltip {position:absolute; padding:6px; font:12px sans-serif; background-color:#FFA; border-radius:8px; pointer-events:none; left:0; top:0;}';
                var ref = document.querySelector('script');
                ref.parentNode.insertBefore(style, ref);
            }

            // Add button to the top menu
            window.add_menu_button('Statespace', 'statespaceMenuItem', 'glyphicon glyphicon-tree-deciduous', "chooseFiles('statespace')");

            // Register this as a user of the file chooser interface
            window.register_file_chooser('statespace', {
                showChoice: function() {
                    window.setup_file_chooser('Statespace', 'Generate Statespace');
                    $('#plannerURLInput').hide();
                },
                selectChoice: ShowStatespace
            });
        },

        // This is called whenever the plugin is disabled
        disable: function() { window.remove_menu_button('statespaceMenuItem'); },

        // Used to save the plugin settings for later
        save: function() { return {}; },

        // Restore the plugin settings from a previous save call
        load: function(settings) {}
    };
});
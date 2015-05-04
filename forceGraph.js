// Specify Dimensions
var width = window.innerWidth,
    height = window.innerHeight,
    numNodes = 16,
    numLinks = 16,
    nodeRadius = 60;

// Less Dumb Data

var graph = {
  "nodes" : [
    // x, y, z
    {"x" : 0 + nodeRadius, "y" : height/3, "fixed" : true  , "type" : 'input'},
    {"x" : 0 + nodeRadius, "y" : height/2, "fixed" : true  , "type" : 'input'},
    {"x" : 0 + nodeRadius, "y" : 2*height/3, "fixed" : true, "type" : 'input'},

    {"x" : width/2, "y" : height/2, "type" : "function"},
    
    // result
    {"x" : width - nodeRadius, "y" : height/2, "fixed" : true, "type" : "output"}
  ],
  "links" : [
    {source : 0, target: 3},
    {source : 1, target: 3},
    {source : 2, target: 3},
    {source : 3, target: 4},
    ]
}

// Dummy Node Data
//
//var graph = {
  //// Nodes
  //"nodes" : _.map(_.range(numNodes), function(n){ return {"x": Math.random() * width, "y": Math.random() * height} }),
  //// Links
  //"links" : _.map(_.range(numLinks), function(n){ 
                //var link = Math.floor((Math.random() * numNodes ) % numNodes);
                //return { source: n % numNodes, target: link }
              //}
            //)
//}

// Shorthand
var nodes = graph.nodes,
    links = graph.links;

// Create SVG
var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .call(d3.behavior.zoom().on("zoom",rescale))
    .on("dblclick.zoom", null)
    .on("mousedown", mousedown);

// Background
var background = svg.append('rect')
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "rgb(242,242,242)");

// Create a wrapper
var vis = svg.append('svg:g');

// Create Force Layout
var force = d3.layout.force()
    .size([width, height])
    .nodes(nodes)
    .linkDistance(width/3)
    .charge(-200)
    .links(links);

// Drag Behavior
var drag = force.drag()
  .on("dragstart", dragstart);

// Define markers for style
var marker = svg.append("svg:defs")
  .append("svg:marker")
  .attr("id", "arrowhead")
  .attr("viewBox", "0 0 10 10")
  .attr("refX", 0)
  .attr("refY", 5)
  .attr("markerUnits", "strokeWidth")
  .attr("markerWidth", 8)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("svg:path")
  .attr("d","M 0 0 L 10 5 L 0 10 z")

function draw(){
  // Define link
  var link = vis.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('x1', function(d) { return nodes[d.source].x; })
      .attr('y1', function(d) { return nodes[d.source].y; })
      .attr('x2', function(d) { return nodes[d.target].x; })
      .attr('y2', function(d) { return nodes[d.target].y; })
      .attr("marker-end", "url(#arrowhead)");

  // Define Node
  var node = vis.selectAll('.node')
      .data(nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', nodeRadius)
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return d.y; })
      .attr('fill',function(d) {
        if(d.type == 'input'){
          return 'rgb(145,207,75)';
        }
        if(d.type == 'output'){
          return 'rgb(247,97,98)';
        }
        else{
          return 'rgb(159,159,159)';
        }
      })
      .on("dblclick", dblclick)
      .call(drag);

  // Animation
  var animating = true;
  var animationStep = 50;
  var ease = 'bounce';

  force.on('tick', function(){

    node.transition().ease(ease).duration(animationStep)
        .attr('cx' , function(d) { return d.x; })
        .attr('cy' , function(d) { return d.y; });

    //path.attr("d", function(d) {
      //var dx = d.target.x - d.source.x,
          //dy = d.target.y - d.source.y,
          //dr = Math.sqrt(dx * dx + dy * dy);
          
      //return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    //});
    
    link.transition().ease(ease).duration(animationStep)
            .attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });

  });
}
draw();

force.start();

// Drag Start
function dragstart(d){
  d3.event.sourceEvent.stopPropagation();
  if (d3.event.sourceEvent.shiftKey){
    d3.select(this).classed("fixed", d.fixed=true);
  }
};

// Double Click
function dblclick(d) {
  d3.select(this).classed("fixed", d.fixed=false);
}

// Rescale g
function rescale(){
  trans = d3.event.translate;
  scale = d3.event.scale;

  vis.attr("transform","translate(" + trans + ")" + " scale(" + scale + ")");
}

// Mouse Down
function mousedown(d) {
  console.log(d3.event.altKey);
  console.log(d3.event.clientX,d3.event.clientY);
  if(d3.event.altKey){
    var newNode = {"x" : d3.event.clientX, "y" : d3.event.clientY, "type" : "function", "fixed":true};
    console.log(newNode);
    graph.nodes.push({"x" : d3.event.clientX , "y" : d3.event.clientY, "type" : "function", "fixed":true})
    draw();
  }
}

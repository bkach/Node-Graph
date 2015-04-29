var draw = function() {

  // Temporary Dataset
  // { name, numInputs, numOutputs }
  var data = [ 
     { 'name' : 'add'         , 'inputs' : ["float","float"]         , 'outputs' : ["float"]                 ,'location' : {"x" : 0,"y" : 0}},
     { 'name' : 'substract'   , 'inputs' : ["float","float"]         , 'outputs' : ["float"]                 ,'location' : {"x" : 0,"y" : 0}},
     { 'name' : 'multiply'    , 'inputs' : ["float","float"]         , 'outputs' : ["float"]                 ,'location' : {"x" : 0,"y" : 0}},
     { 'name' : 'divide'      , 'inputs' : ["float","float"]         , 'outputs' : ["float"]                 ,'location' : {"x" : 0,"y" : 0}},
     { 'name' : 'vecToFloats' , 'inputs' : ["vec3"]                  , 'outputs' : ["float","float","float"] ,'location' : {"x" : 0,"y" : 0}},
     { 'name' : 'floatsToVec' , 'inputs' : ["float","float","float"] , 'outputs' : ["vec3"]                  ,'location' : {"x" : 0,"y" : 0}}
   ];

  // Constants
  var w = window.innerWidth;
  var h = window.innerHeight;
  var nodeW = (w/data.length) - (w/data.length/4);
  var nodeH = nodeW * 1.7;
  var padding = 30;

 
  // Dummy Data
  for(var i=0; i<data.length; i++){
    data[i].location.x = ((w/data.length) * i) + ((w/data.length)/2) - nodeW/2;
    data[i].location.y = h/2 - nodeH/2;
  }

  // Zoom Behavior
  var zoom = d3.behavior.zoom()
    .scaleExtent([1,10]) 
    .on("zoom", function(){
      trans = d3.event.translate;
      scale = d3.event.scale;
      container.attr("transform", "translate(" + trans + ")" + " scale(" + scale + ")");
    });
  
  // SVG Element 
  var svg = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .call(zoom);
    
  // Container - needed for zooming
  var container = svg.append("g");


  // Drag Line
  var dragLine = container.append("path")
    .attr('d','M10,10L50,50')
    .attr('class','hidden')
    .attr("stroke","black")
    .attr("stroke-width",2)
    .attr("fill","none");

  // Drag Behavior
  var resultantX;
  var resultantY;
  var drag = d3.behavior.drag()
      .origin(function(d) { 
        var t = d3.select(this);
        return {x:t.attr('x'), y:t.attr('y')};
      })
      .on("dragstart", function(){
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.sourceEvent.shiftKey){
          d3.select(this).classed("dragging", true);
        }
      })
      .on("drag", function(d){
        // Dragging a line
        if (d3.event.sourceEvent.shiftKey){
          console.log(d.location.x,d.location.y);
          console.log(d3.event.x,d3.event.y);
          

          dragLine.classed('hidden',false)
            .attr('d','M' + d.location.x + ',' + d.location.y + 
              'L' + d3.event.x + ',' + d3.event.y);
          return false;
        } 
        else
        {
          resultantX = d.location.x + d3.event.x;
          resultantY = d.location.y + d3.event.y;
          d3.select(this)
          .attr("transform", "translate(" + resultantX + "," + resultantY + ")");
        }
      })
      .on("dragend", function(d){
        if(!d3.event.sourceEvent.shiftKey){
          d.location.x = resultantX;
          d.location.y = resultantY;
        }
        d3.select(this).classed("dragging", false);
      });



  // Create Bounding Box
  var borderPath = container.append("rect")
    .attr("class","boundingRectangle")
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", h)
    .attr("width", w)
    .style("stroke", "black")
    .style("fill", "none")
    .style("stroke-width", 2);

  // Test Nodes
  var node = container.selectAll(".node")
    .data(data)
    .enter()
    .append("g")
    .attr("class","node")
    .attr("width",nodeW)
    .attr("height",nodeH)
    //.attr("transform","translate(1,200)")
    .attr("transform", function(d){ 
      return "translate(" + d.location.x + "," + d.location.y + ")"; 
     })
    .call(drag);

  var nodeRect = node
   .append("rect")
   .attr("class","nodeRectangle")
   .attr("width",  nodeW)
   .attr("height", nodeH)
   .attr("rx", 20)
   .attr("ry", 20)
   .attr("stroke", "black")
   .attr("stroke-width", 5)
   .attr("fill", "white");

  var nodeTitle = node
    .append("text")
    .attr("x", function(d){
      return nodeW/2 - d.name.length*4;
    })
    .attr("y", nodeH/3)
    .text(function(d){
      return d.name;
    });

  //var inputs = node.selectAll("circle")
    //.data(function(d,i){
      //return d.inputs;
    //})
    //.enter()
    //.append("circle")
    //.attr("class","input")
    //.attr("r", function(d,i){
      //return nodeH/d.length/4;
    //})
    //.attr("cx", 0)
    //.attr("cy", function(d,i){
      //numInputs = data[i].inputs.length;
      //return (nodeH/numInputs) * (i);
    //})
    //.attr("fill","grey");

}


draw();

window.addEventListener('resize', function(event){
  d3.select('svg').remove();
  draw();
});

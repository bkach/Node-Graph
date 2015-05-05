// Constants
var debug = true;
//var debug = true;    

var width = window.innerWidth,
    height = window.innerHeight,
    nodeRadius = height / 20,
    linkWidth = 2,
    nodeStrokeWidth = nodeRadius/10,
    nodeSelectedStrokeWidth = nodeRadius/5,
    arrowWidth = 5,
    arrowLength = 5,
    arrowOffset = nodeRadius + 3,
    forceCharge = -100,
    forceLinkDistance = width/5,
    gooGreen = 'rgb(145,207,75)',
    gooRed = 'rgb(247,97,98)',
    gooLightGrey = 'rgb(247,247,247)',
    gooGrey = 'rgb(159,159,159)',
    gooMidGrey = 'rgb(109,109,109)',
    gooDarkGrey = 'rgb(41,43,47)',
    gooBlue = 'rgb(71,184,217)';

var functionColor = gooGrey,
    inputColor = gooGreen,
    outputColor = gooRed,
    arrowColor = gooLightGrey,
    linkColor = gooLightGrey,
    backgroundColor = gooDarkGrey,
    nodeStrokeColor = gooMidGrey,
    selectedColor = gooBlue;

// Global Elements
var nodeElement,
    linkElement;

var graphData = {
  'nodes' : [
    // x, y, z
    {'x' : 0 + nodeRadius + 10, 'y' : height/3, 
      'fixed' : true  , 'type' : 'ExternalInput', 'id': 'x'},
    {'x' : 0 + nodeRadius + 10, 'y' : height/2, 
      'fixed' : true  , 'type' : 'ExternalInput', 'id': 'y'},
    {'x' : 0 + nodeRadius + 10, 'y' : 2*height/3, 
      'fixed' : true, 'type' : 'ExternalInput', 'id': 'z'},
    // out
    {'x' : width - (nodeRadius + 10), 'y' : height/2, 
      'fixed' : true, 'type' : 'output', 'id': 'out'},
    // function
    {'x' : width/2, 'y' : height/2, 
      'type' : 'fn', 'id': 'fn', 'code' : 'fn code'},
  ]};

graphData.links = 
   [
    {source : graphData.nodes[0], target: graphData.nodes[4]},
    {source : graphData.nodes[1], target: graphData.nodes[4]},
    {source : graphData.nodes[2], target: graphData.nodes[4]},
    {source : graphData.nodes[4], target: graphData.nodes[3]},
  ];

// The Graph Object
function Graph(){

  var instance;

  this.init = function(){
    instance = this;
  }

  var spaceDown = false,
      altDown = false,
      justDragged = false,
      scale = 1,
      trans = [0,0],
      aceEditor,
      lastDragPosition;

  this.addNode = function(id){
    graphData.nodes.push({
      'id':id, 
      'x' : window.innerWidth/2, 
      'y' : window.innerHeight/2, 
      'fixed' : false, 'type' : 
      'fn', 
      'code': id + ' code' });
    update();
    if (debug){ console.log('Node ' + id + ' added'); }
  };

  this.addLink = function (source,target){
    var duplicate = false;

    for (var i in graphData.links){
      if(graphData.links[i].source.id == source &&
         graphData.links[i].target.id == target){
          duplicate = true;
          if (debug){ console.log('Duplicate link ' + source + ' - ' + target + 'not added'); }
      }
    }
    if(!duplicate){
      graphData.links.push({'source': findNode(source), 'target': findNode(target)});
      if (debug){ console.log('Link ' + source + ' - ' + target + ' added'); }
    }
    update();
  };

  var removeNode = function (id) {
      dbg('Removing ' + id);
      var i = 0;
      var n = findNode(id);
      while (i < links.length) {
          if ((links[i]['source'] == n) || (links[i]['target'] == n)) {
              dbg('\tRemoving ' + links[i]['source'].id + ' - ' + links[i]['target'].id);
              links.splice(i, 1);
          }
          else i++;
      }
      graphData.nodes.splice(findNodeIndex(id), 1);
      update();
  };

  var removeLink = function (source, target) {
      dbg('Removing ' + source + ' - ' + target);
      for (var i = 0; i < links.length; i++) {
          if (links[i].source.id == source && links[i].target.id == target) {
              links.splice(i, 1);
              break;
          }
      }
      update();
  };

  this.removeallLinks = function () {
      links.splice(0, links.length);
      update();
  };

  this.removeAllNodes = function () {
      nodes.splice(0, links.length);
      update();
  };

  var findNode = function(id) {
    for (var i in nodes){
      if (nodes[i]['id'] === id) return nodes[i];
    }
  };

  var findNodeIndex = function(id){
    for (var i = 0; i < graphData.nodes.length; i++){
      if (graphData.nodes[i].id == id){
        return i;
      }
    }
  }

  var keydown = function(){
    // Space - "sticks" nodes in place
    if (d3.event.keyCode == 32){
      spaceDown = true;
    }
    // Escape - Deselects all
    if (d3.event.keyCode == 27){
      deselectAll();
    }
    // Alt - Begin drawing link
    if(!altDown){
      if(d3.event.altKey){
        altDown = true;
        removeListeners();

        d3.selectAll('.node') 
          .call(dragLineBehavior());
      }
    }
  }

  // Behavior dictating a drawn link
  var dragLineBehavior = function(){
    return d3.behavior.drag()
        .on('dragstart', function(d){
          allLinks.append('line')
             .attr('class', 'draw')
             .attr('x1',d.x)
             .attr('y1',d.y)
             .attr('x2',d.x)
             .attr('y2',d.y)
             .attr('stroke', linkColor)
             .attr('stroke-width', linkWidth)
             .attr('marker-end', 'url(#endDraw)');
        })
        .on('drag', function(){
          lastDragPosition = {'x':d3.event.x,'y':d3.event.y};
          d3.select('.draw')
            .attr('x2', lastDragPosition.x)
            .attr('y2', lastDragPosition.y);
        })
        .on('dragend', function(d){
          
          vis.selectAll('.node').each(function() {
            p = {'x':lastDragPosition.x,'y':lastDragPosition.y};
            c = 
              {
                x: this.getAttribute('cx'),
                y: this.getAttribute('cy'),
                r: this.getAttribute('r')
              };

            if(pointWithinCircle(p,c))
            {
              d3.select('.draw').remove();
              graph.addLink(d.id,this.id);
            }
          })
        })
  }

  // Check the given point is within a circle
  var pointWithinCircle = function(p,c){
    var d = Math.sqrt(Math.pow(c.x-p.x,2) + Math.pow(c.y-p.y,2));
    return (d < c.r) ? true : false;
  }

  var keyup = function(){
    // space
    if (d3.event.keyCode == 32){
      spaceDown = false;
    }
    // alt - Line drawing ended, add listeners 
    if(d3.event.keyCode == 18){
      altDown = false;
      d3.select('.draw').remove();
      removeListeners();
      addListeners();
    }
    // d - remove nodes
    if(d3.event.keyCode == 68){
      var selectedList = d3.selectAll('.node,.link').filter('.selected')[0];
      for (var i in selectedList){
        var id = selectedList[i].id;
        // Delete Link
        if (selectedList[i].classList[0] == 'link'){
          var source = selectedList[i].id.split('-')[0],
              target = selectedList[i].id.split('-')[1];
          removeLink(source,target);
          deselectAll();
        }
        // Delete Node
        else if(selectedList[i].classList[0] == 'node'){
          removeNode(id);
          deselectAll();
        }
      }
    }
    // a - add node
    if(d3.event.keyCode == 65){
      instance.addNode("newNode " + Date.now());
    }
  }

  var dragstart = function(d){
    d3.event.sourceEvent.stopPropagation();
  };

  // If space pressed on drag, fix node in place
  var drag = function(d){
    if (spaceDown){
      d3.select(this).classed('fixed', d.fixed=true);
    }
    justDragged = true;
  }
  
  var deselectAll = function(){
    d3.selectAll('.node')
      .classed('selected',false)
      .attr('stroke', nodeStrokeColor)
      .attr('stroke-width', nodeStrokeWidth);

    d3.selectAll('.link')
      .classed('selected',false)
      .style('stroke', linkColor);

    dbg("Deselecting All");
  }

  var isSelected = function(element){
    var classList = element[0][0].classList;
    for (var i=0; i<classList.length; i++){
      cl = classList[i];
      if (cl == 'selected'){
        return true;
      }
    }
    return false;
  }

  var select = function(element){
    var notSelected = !(isSelected(element));
    if (!d3.event.shiftKey){
      deselectAll();
    }
    if(notSelected){
      dbg("Selecting " + element[0][0].id);
      if (element[0][0].classList[0] == 'node')
      {
        element 
          .attr('stroke', selectedColor)
          .attr('stroke-width', nodeSelectedStrokeWidth)
          .classed('selected',true);
      }
      else
      {
        element
          .classed('selected',true)
          .style('stroke', selectedColor);
      }
    }
  }
  
  // Right click on background to deselect all
  var backgroundRClick = function(d){
    d3.event.preventDefault();
    deselectAll();
  }

  // Click listener for nodes and links, allows for selecting
  var selectClick = function(d){
    element = d3.select(this);
    if(!justDragged){
      select(element);
    }
    else
    {
      justDragged = false;
    }
  }

  // Zooms to a specified translation vector and scale, and subsequently calls the callback
  var programmaticZoom = function(translate,scale,duration,callback){
    dbg("Zooming to t:" + translate + " s:" + scale);
    zoomListener.translate(translate).scale(scale);
    zoomListener.event(vis.transition().duration(duration).each('end',callback));
  }

  // Double click on background to remove container and reset viewport
  var dblclickBackground = function(d){
    var zoomDuration = 500,
        editor;

    if(d3.select('#editor')[0][0]){
      editor = d3.select('#editor');
      editor
        .transition()
        .style('margin-top', '-50px')
        .style('margin-left', '-50px')
        .style('width', 0 + 'px')
        .style('height', 0 + 'px')
        .each('end',function(){
          editor.remove(); 
          programmaticZoom([0,0],1,zoomDuration,null);
          addListeners();
        });
    }
    else
    {
      programmaticZoom([0,0],1,zoomDuration,null);
    }

  }

  // Double click on node to zoom to node
  var dblclickNode = function(d) {
    var dx = nodeRadius * 2,
        dy = nodeRadius * 2,
        scale = .9 / Math.max(dx/width,dy/height),
        translate = [width / 2 - scale * d.x, height / 2 - scale * d.y]
        zoomDuration = 500;
   
    if (d.type == 'fn'){
      deselectAll();
      removeListeners();
      programmaticZoom(translate,scale,zoomDuration,setUpEditor(d));
    }
    else{
      dbg("Not a function, zoom canceled");
    }
  }

  // Create the Ace editor
  var setUpEditor = function(d){
    var tRad = Math.min(width,height) / 2,
        editorDuration = 500;

    dbg('add editor');
    var editor =
      d3.select('body')
      //.insert('xhtml:div',':first-child')
      .append('xhtml:div')
        .attr('id','editor')
        .style('position','absolute')
        .style('top', '50%')
        .style('left', '50%')
        .style('margin-top', '-50px')
        .style('margin-left', '-50px')
        .style('width', 0 + 'px')
        .style('height', 0 + 'px')
        .style('z-index', 9999)
      .transition()
      .ease('bounce')
      .delay(500)
      .duration(editorDuration)
        .style('margin-top', '-' + tRad/2 + 'px')
        .style('margin-left', '-' + tRad/2 + 'px')
        .style('width', tRad + 'px')
        .style('height', tRad + 'px')
      .each('start',function(){
        aceEditor = ace.edit('editor');
        aceEditor.setTheme('ace/theme/monokai');
        aceEditor.getSession().setMode('ace/mode/glsl');
        aceEditor.getSession().setUseWrapMode(true);
        aceEditor.getSession().on('change', function(e){
          d.code = aceEditor.getValue();
        });
        aceEditor.$blockScrolling = Infinity;
      })
      .each('end',function(){
        aceEditor.insert(d.code);
        aceEditor.setTheme('ace/theme/monokai');
        aceEditor.getSession().setMode('ace/mode/glsl');
        aceEditor.getSession().setUseWrapMode(true);
        aceEditor.getSession().on('change', function(e){
          d.code = aceEditor.getValue();
        });
      });
  }

  // Debug print
  var dbg = function(s){
    if(debug){ console.log('debugger: ' + s); }
  }

  // Adding and removing listeners is essential to making sure
  // interactions within the Ace text field are isolated

  var addListeners = function(){
    // Add node listeners
    dbg('listeners added');
    nodeElement
        .on('click', selectClick)
        .on('dblclick', dblclickNode)
        .call(drag);

    // Add zoom listener
    svg
      .call(zoomListener)
      .on('dblclick.zoom', null);
  }

  var removeListeners = function(){
    // Remove node listeners
    dbg('listeners removed');
    d3.selectAll('.node') 
      .on('click', null)
      .on('dblclick', null)
      .on('mousedown.drag', null);

    // Remove zoom listener
    svg
      .on('mousedown.zoom', null)
      .on('mousewheel.zoom', null)
      .on('mousemove.zoom', null)
      .on('DOMMouseScroll.zoom', null)
      .on('dblclick.zoom', null)
      .on('touchstart.zoom', null)
      .on('touchmove.zoom', null)
      .on('touchend.zoom', null);
    
    // TODO: bug, scroll still works!
  }

  var rescale = function(){
    trans = d3.event.translate;
    scale = d3.event.scale;

    vis.attr('transform','translate(' + trans + ')' + ' scale(' + scale + ')');
  }

  // Function from: http://bl.ocks.org/mbostock/7881887
  // Resolves collisions between d and all other circles.
  var collide = function(alpha) {
    var padding = 10;
    var quadtree = d3.geom.quadtree(graphData.nodes);
    return function(d) {
      var rb = 2*nodeRadius + padding,
          nx1 = d.x - rb,
          nx2 = d.x + rb,
          ny1 = d.y - rb,
          ny2 = d.y + rb;
      quadtree.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
              y = d.y - quad.point.y,
              l = Math.sqrt(x * x + y * y);
            if (l < rb) {
            l = (l - rb) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }

  // Set up the D3 visualization

  // Creates the graph
  var force = d3.layout.force()
      .size([width, height])
      .nodes(graphData.nodes)
      .links(graphData.links)
      .linkDistance(forceLinkDistance)
      .charge(forceCharge);

  // Adds the drag functionality
  var drag = force.drag()
    .on('dragstart', dragstart)
    .on('drag', drag);

  // References the data
  var nodes = force.nodes(),
      links = force.links();

  // Adds the zoom behavior
  var zoomListener = d3.behavior.zoom().on('zoom',rescale);
  
  // svg container
  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height)
      .call(zoomListener)
      .on('dblclick.zoom', null)

  // Arrow definitions (to be used on nodes)
      
  var defs = svg.append('defs');
  defs
    .append('marker')
      .attr('id', 'endNode')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', arrowOffset)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d','M 0,-' + arrowWidth/2 + 'L' + arrowLength + ',0 L 0,' + arrowWidth/2)
      .style('stroke', arrowColor)
      .style('fill', arrowColor);
 
  defs.append('marker')
      .attr('id', 'endDraw')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d','M 0,-5 L 10,0 L 0,5')
      .style('stroke', arrowColor)
      .style('fill', arrowColor);


  // Keyboard callback
  d3.select(window)
      .on('keydown', keydown)
      .on('keyup', keyup);

  // Background
  var background = svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', backgroundColor)
    .on('contextmenu', backgroundRClick)
    .on('dblclick', dblclickBackground);

  // Vis object - what will be zoomed and edited
  var vis = svg.append('svg:g');

  var allLinks = 
    vis
      .append('g')
      .attr('class','links');

  var allNodes = 
    vis
      .append('g')
      .attr('class','nodes');

  // update() creates all the elements,
  // but the force layout does not
  // re add information, it only preserves
  // the integrity of the data.
  var update = function(){

    linkElement = allLinks.selectAll('.link')
        .data(links);

    linkElement
        .enter().append('line')
        .attr('class', 'link')
        .style('stroke', linkColor)
        .style('stroke-width', linkWidth)
        .on('click',selectClick)
        .style('marker-end', 'url(#endNode)');

    linkElement.exit().remove();

    nodeElement = allNodes.selectAll('.node')
        .data(nodes);

    nodeElement
        .enter()
       .append('circle')
        .attr('class', 'node')
        .attr('cx' , function(d) { return d.x; })
        .attr('cy' , function(d) { return d.y; })
        .attr('r', nodeRadius)
        .attr('stroke', nodeStrokeColor)
        .attr('stroke-width', nodeStrokeWidth)
        .on('click', selectClick)
        .on('dblclick', dblclickNode)
        .call(drag);
    
    nodeElement.exit().remove();

    var animationStep = 50;
    var ease = 'linear';

    // How to dynamically update the force graph.
    // Note: cannot trust the dom! Elements switch
    // around at will. The data must be tied here.
    force.on('tick', function(){

      allNodes.selectAll('.node')
          .attr('cx' , function(d) { return d.x; })
          .attr('cy' , function(d) { return d.y; })
          .attr('id', function(d) { return d.id; })
          .attr('fill',function(d) {
            if(d.type == 'ExternalInput'){ return inputColor; }
            if(d.type == 'output'){ return outputColor; }
            else{ return functionColor; }
          })
          .each(collide(0.5));

      linkElement
          .attr('id', function(d) { return d.source.id + '-' + d.target.id })
          .attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });

    });

    // Restart force layout
    force
      .linkDistance(forceLinkDistance)
      .charge(forceCharge)
      .start();

  };

  update();
  this.init();
}

// Some test data
//shaderBits.buildShader({"test"},{"test"});
var graph = new Graph();
//graph.addNode('fn2');
//graph.addNode('fn3');
//graph.addLink('fn','fn2');
//graph.addLink('fn','fn3');
//graph.addLink('fn2','out');
//graph.addLink('fn3','out');

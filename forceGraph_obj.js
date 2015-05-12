d3.json('/data/testData.json',function(error,json){
  // Constants
  var debug = true;
  //var debug = false;    

  var width = window.innerWidth,
      height = window.innerHeight,
      nodeRadius = height / 20,
      ioRadius = nodeRadius / 4,
      linkWidth = 2,
      nodeStrokeWidth = nodeRadius/10,
      nodeSelectedStrokeWidth = nodeRadius/5,
      arrowWidth = 10,
      arrowLength = 10,
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
      linkElement,
      allNodes,
      inputGroup,
      nodeGroup,
      outputGroup;

  var graphData = json;

  // Organize Elements
  graphData.nodes[0].x = nodeRadius + 10;
  graphData.nodes[0].y = height/3;
  graphData.nodes[1].x = nodeRadius + 10;
  graphData.nodes[1].y = height/2;
  graphData.nodes[2].x = nodeRadius + 10;
  graphData.nodes[2].y = 2*height/3;
  graphData.nodes[3].x = width - (nodeRadius + 10);
  graphData.nodes[3].y = height/2;

  // The Graph Object
  function Graph(){

    var altDown = false,
        justDragged = false,
        spaceDown = false,
        scale = 1,
        trans = [0,0],
        aceEditor,
        lastDragPosition,
        instance,
        mouse = [0,0]
        currentLocation = {'t': [0,0], 's':1};
        lastLocation = {'t': [0,0], 's':1};

    this.init = function(){
      instance = this;
    }

    this.addNode = function(id){
      var node =
        {
           "x" : mouse[0],
           "y" : mouse[1],
           "id":id,
           "fixed":false,
           "type":"fn",
           "inputs":[],
           "outputs":[],
           "code" : "gl_FragColor = vec3(var1,var2,var3);"
        };
      for(var i = 0; i < Math.floor((3*Math.random())+1); i++){
        node.inputs.push({
          'name' : i,
          'type' : 'float'
        })
      }
      for(var i = 0; i < Math.floor((3*Math.random())+1); i++){
        node.outputs.push({
          'name' : i,
          'type' : 'float'
        })
      }
      graphData.nodes.push(node);
      update();
      dbg('Node ' + id + ' added');
    };

    this.addLink = function (source,target,sourceOutput,targetInput){

      // TODO: bug, duplicate links
      var dup = false;
      if(source == target)
      {
        dbg('Links cannot be added to the same element');
        dup = true;
      }
      else
      {
        for(var i in graphData.links){
          lnk = graphData.links[i];
          if((lnk.source == source && 
              lnk.sourceOutput == sourceOutput)
              ||
              (lnk.target == target && 
              lnk.targetInput == targetInput))
          {
            dbg('duplicate link, not added')
            dup = true;
          }
        }
        if(!dup) 
        {
          graphData.links.push(
              {'source': source, 
               'target': target,
               'sourceOutput':sourceOutput,
               'targetInput':targetInput
              });
          dbg('Link ' + source.id + ' - ' + target.id + ' (' + sourceOutput + '-' + targetInput + ') added');
          update();
        }
      }
    };

    var removeNode = function (id) {
        dbg('Removing ' + id);
        var i = 0;
        var n = findNode(id);
        while (i < links.length) {
            if ((links[i]['source'] == n) || (links[i]['target'] == n)) {
                dbg('\tRemoving All links from: ' + links[i]['source'].id + ' - ' + links[i]['target'].id);
                links.splice(i, 1);
            }
            else i++;
        }
        nodeIndex = findNodeIndex(id);
        graphData.nodes.splice(nodeIndex, 1);
        update();
    };

    var removeLink = function (source, target, sourceOutput, targetInput) {
        dbg('Removing ' + source + '-' + target + '-' + sourceOutput + '-' + targetInput);
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

    var findLink = function(id) {
      var source = id.split('-')[0],
          target = id.split('-')[1];
      for (var i in links){
        if (links[i]['source'].id === source && links[i]['target'].id === target) return links[i];
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
          //d3.selectAll('.nodeGroup') 
            //.call(dragLineBehavior());
        }
      }
    }


    var keyup = function(){
      // Space
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
        var selectedList = getSelected();
        for (var i = 0; i < selectedList.length; i++){
          var id = selectedList[i].parentElement.id;
          // Delete Link
          if (selectedList[i].classList[0] == 'link'){
            var source = selectedList[i].id.split('-')[0],
                target = selectedList[i].id.split('-')[1];
                sourceOutput = selectedList[i].id.split('-')[2],
                targetInput = selectedList[i].id.split('-')[3];
            removeLink(source,target,sourceOutput,targetInput);
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
        instance.addNode("newNode" + Date.now());
      }
      if(d3.event.keyCode == 83){
        nodes[0].inputs.push(
            {
               "name":"inx",
               "type":"float"
            }
        );
        update();
      }
      if(d3.event.keyCode)
      {
        console.log(graphData);
      }
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

    var getSelected = function(){
      return d3.selectAll('.node,.link').filter('.selected')[0];
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

    // Perform selection on an element
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
            programmaticZoom(lastLocation.t,lastLocation.s,zoomDuration,null);
            addListeners();
          });
      }
      else
      {
        programmaticZoom(lastLocation.t,lastLocation.s,zoomDuration,null);
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

        lastLocation.t = currentLocation.t;
        lastLocation.s = currentLocation.s;

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
      d3.selectAll('.node')
          .on('click', selectClick)
          .on('dblclick', dblclickNode);

      // Add group listener
      //nodeGroup.selectAll('.nodeGroup').call(forceDrag);
      nodeGroup.call(forceDrag);

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
        .on('dblclick', null);

     nodeGroup
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
      currentLocation.t = trans;
      currentLocation.s = scale;

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
    
    // Behavior for drawing line
    var circleAbsPosition;
    var drawLine =
      d3.behavior.drag()
        .on('dragstart',function(d){
          d3.event.sourceEvent.stopPropagation();
          force.stop();
          circle = {'x':parseInt(this.getAttribute('cx')),
                    'y':parseInt(this.getAttribute('cy'))};
          parent = {'x': d3.select('#' + d.parent.id)[0][0].__data__.x,
                    'y': d3.select('#' + d.parent.id)[0][0].__data__.y};
          circleAbsPosition = {'x' : circle.x + parent.x,
                            'y' : circle.y + parent.y};
          allLinks.append('line')
            .attr('class','draw')
            .attr('x1',circleAbsPosition.x)
            .attr('y1',circleAbsPosition.y)
            .attr('x2',circleAbsPosition.x)
            .attr('y2',circleAbsPosition.y)
            .attr('stroke', linkColor)
            .attr('stroke-width', linkWidth)
            .style('marker-start', 'url(#start)')
            .style('marker-end', 'url(#end)');
        })
        .on('drag',function(d){
          lastDragPosition = {'x':d3.event.x + d3.select('#' + d.parent.id)[0][0].__data__.x,
                              'y':d3.event.y + d3.select('#' + d.parent.id)[0][0].__data__.y};
          d3.select('.draw')
            .attr('x2', lastDragPosition.x)
            .attr('y2', lastDragPosition.y);
        })
        .on('dragend',function(d){
          d3.select('.draw').remove();
          d3.selectAll('.nodeGroup').selectAll('.input,.output').each(
              function(){
                c = 
                  {
                    x: parseInt(this.getAttribute('cx')) +
                        findNode(this.parentElement.id).x,
                    y: parseInt(this.getAttribute('cy')) +
                        findNode(this.parentElement.id).y,
                    r: parseInt(this.getAttribute('r'))
                  };

                if(pointWithinCircle(lastDragPosition,c)){
                  if(this.getAttribute('class') == 'input')
                  {
                    source = d.parent;
                    sourceOutput = d.index;
                    target = findNode(this.parentElement.getAttribute('id'));

                    var targetInput;
                    for (i in target.inputs){
                      if(target.inputs[i].name == this.id.split('.')[0])
                        targetInput = i;
                    }
                    instance.addLink(
                      source,
                      target,
                      sourceOutput,
                      targetInput)
                  }
                  else
                    dbg("Cannot connect output to output");
                }
              }
          );
          force.start();
        });
        
    // Check the given point is within a circle
    var pointWithinCircle = function(p,c){
      var d = Math.sqrt(Math.pow(c.x-p.x,2) + Math.pow(c.y-p.y,2));
      return (d < c.r) ? true : false;
    }
    
    // Adds the drag functionality
    var forceDrag =
      d3.behavior.drag()
      .on('dragstart', 
        function(d){
          d3.event.sourceEvent.stopPropagation();
        }
      )
      .on('drag', 
        function(d){
          d3.select(this).classed('fixed', d.fixed=true);
          justDragged = true;

          // Move element
          d.px += d3.event.dx;
          d.py += d3.event.dy;
          d.x += d3.event.dx;
          d.y += d3.event.dy;

          tick();
      })
    .on('dragend',
        function(d){
          if(spaceDown){
            d3.select(this).classed('fixed', d.fixed=false);
          }
          else{
            d3.select(this).classed('fixed', d.fixed=true);
          }
            
          force.start();
        });

    // Set up the D3 visualization

    // Creates the graph
    var force = d3.layout.force()
        .size([width, height])
        .nodes(graphData.nodes)
        .links(graphData.links)
        .linkDistance(forceLinkDistance)
        .charge(forceCharge);



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
        .on('mousemove',function(){
          mouse = d3.mouse(this);
        });


    // Arrow definitions (to be used on nodes)
        
    var defs = svg.append('defs');
    // marker end
    defs
      .append('marker')
        .attr('id', 'end')
        .attr('viewBox', '-20 -20 40 40')
        .attr('markerWidth', 20)
        .attr('markerHeight', 20)
        .attr('orient', 'auto')
      .append('circle')
        .attr('cx',0)
        .attr('cy',0)
        .attr('r',10)
        .style('stroke', arrowColor)
        .style('fill', arrowColor);

    // marker start
    defs
      .append('marker')
        .attr('id', 'start')
        .attr('viewBox', '-5 -5 10 10')
        .attr('refX', -2)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
      .append('path')
        .attr('d','M 0,0 m -5,-5 L 5,0 L -5,5 Z')
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
    var vis = 
      svg.append('svg:g')
         .attr('class','vis');

    allNodes = 
      vis
        .append('g')
        .attr('class','nodes');

    var allLinks = 
      vis
        .append('g')
        .attr('class','links');


    // update() creates all the elements,
    // but the force layout does not
    // re add information, it only preserves
    // the integrity of the data.
    var update = function(){

      // Create and add link elements
      linkElement = allLinks.selectAll('.link')
          .data(links);

      // Add line and listener
      linkElement
          .enter().append('line')
          .attr('class', 'link')
          .style('stroke', linkColor)
          .style('stroke-width', linkWidth)
          .on('click',selectClick)
          .style('marker-start', 'url(#start)')
          .style('marker-end', 'url(#end)');

      linkElement.exit().remove();

      // Create and add node Groups
      nodeGroup = d3.select('.nodes').selectAll('.nodeGroup')
          .data(nodes,function(d){ return d.id + '-' + d.inputs.length + '-' + d.outputs.length; })
          .enter()
        .append('g')
          .attr('class',function(d){ return 'nodeGroup';})
          .call(forceDrag);


      // Add circle
      nodeGroup
          .append('circle')
            .attr('class', 'node')
            .attr('id', function(d){ return d.id })
            .attr('r', nodeRadius)
            .attr('stroke', nodeStrokeColor)
            .attr('stroke-width', nodeStrokeWidth)
            .on('click', selectClick)
            .on('dblclick', dblclickNode)

      // Add Input group
      nodeGroup.selectAll('.inputGroup') 
          .data(function(d,i){
            // Extra information is needed to calculate
            // where the inputs should be placed
            inputs = 
              d.inputs.map(function(input,i){
                obj = 
                  { 'total' : d.inputs.length,
                    'index' : i,
                    'parent' : d,
                    'name' : input.name,
                    'type' : input.type,
                    'io'   : 'input'};
                return obj;
              })
            return inputs;
          }, function(d){ return d.name + d.type;})
          .enter()
          .append('circle')
            .attr('class','input')
            .attr('r', ioRadius)
            .attr('fill', inputColor)
            .attr('stroke', nodeStrokeColor)
            .attr('stroke-width', nodeStrokeWidth);
            //.call(drawLine);

      // Add output group
      nodeGroup.selectAll('.outputGroup')
          .data(function(d,i){
            // Likewise, extra information is needed
            // for where the outputs should be placed
            outputs = 
              d.outputs.map(function(output,i){
                obj = 
                  { 'total' : d.outputs.length,
                    'index' : i,
                    'parent' : d,
                    'name' : output.name,
                    'type' : output.type,
                    'io'   : 'output'};
                return obj;
              })
            return outputs;
          }, function(d){ return d.name + d.type;})
        .enter()
          .append('circle')
            .attr('class','output')
            .attr('r', ioRadius)
            .attr('fill', outputColor)
            .attr('stroke', nodeStrokeColor)
            .attr('stroke-width', nodeStrokeWidth)
            .call(drawLine);


      // Remove node group element - to remove inputs,node, and outputs
      d3.select('.nodes').selectAll('.nodeGroup')
          .data(nodes,function(d){ return d.id; }).exit().remove();

      d3.select('.nodes').selectAll('.nodeGroup').order();

      // How to dynamically update the force graph.
      // Note: cannot trust the dom! Elements switch
      // around at will. The data must be tied here.
      force.on('tick', tick)

      // Restart force layout
      force
        .linkDistance(forceLinkDistance)
        .charge(forceCharge)
        .start();

    };

    var tick = function(){
        // Move node group, easier to move the group
        // instead of each element
        allNodes.selectAll('.nodeGroup')
           .attr('id', function(d) { return d.id; })
           .attr('transform',function(d,i){
             if(!d.x || !d.y){
               d.x = 0;
               d.y = 0;
             }
             return 'translate(' + d.x + ',' + d.y + ')';
           })
           .each(collide(0.5));
        
        // Alter node properties
        allNodes.selectAll('.node')
            .attr('fill',function(d) {
              if(d.type == 'ExternalInput'){ return inputColor; }
              if(d.type == 'output'){ return outputColor; }
              else{ return functionColor; }
            });

        // Calculate the radian value needed
        // to place the inputs and outputs
        var calcRad = function(d){
          // Offsetts the values so it looks nice
          perc = d.index / d.total;
          radPerc = Math.PI/4 + ((Math.PI/2 * perc) * 1.5);

          if(d.io === 'input') { return (3*Math.PI/2) - (radPerc) }
          if(d.io === 'output') { return (3*Math.PI/2) + (radPerc) }
        };


        // Move Input Links
        nodeGroup.selectAll('.input')
          .attr('id',function(d){ return d.name + '.' + d.type })
          .attr('cx' , function(d) { return Math.cos(calcRad(d)) * nodeRadius; })
          .attr('cy' , function(d) { return Math.sin(calcRad(d)) * nodeRadius; });
          
        // Move Output Links
        nodeGroup.selectAll('.output')
          .attr('id',function(d){ return d.name + '.' + d.type })
          .attr('cx' , function(d) { return Math.cos(calcRad(d)) * nodeRadius; })
          .attr('cy' , function(d) { return Math.sin(calcRad(d)) * nodeRadius; });

        // Move Links
        linkElement
            .attr('id', function(d) { return d.source.id + '-' + d.target.id + '-' 
              + d.sourceOutput + '-' + d.targetInput})
            .attr('x1', function(d) { 
              rad = calcRad({
                    'index': d.sourceOutput,
                    'total': d.source.outputs.length,
                    'io'   : 'output'});
              return d.source.x + (Math.cos(rad) * nodeRadius);
            })
            .attr('y1', function(d) { 
              rad = calcRad({
                    'index': d.sourceOutput,
                    'total': d.source.outputs.length,
                    'io'   : 'output'});
              return d.source.y + (Math.sin(rad) * nodeRadius);
            })
            .attr('x2', function(d) {
              rad = calcRad({
                    'index': d.targetInput,
                    'total': d.target.inputs.length,
                    'io'   : 'input'});
              return d.target.x + (Math.cos(rad) * nodeRadius);
            })
            .attr('y2', function(d) {
              rad = calcRad({
                    'index': d.targetInput,
                    'total': d.target.inputs.length,
                    'io'   : 'input'});
              return d.target.y + (Math.sin(rad) * nodeRadius);
            })
    }

    update();
    this.init();
  }

  // Some test data
  //shaderBits.buildShader({"test"},{"test"});
  var graph = new Graph();
});

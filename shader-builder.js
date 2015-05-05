(function () {
	'use strict';

	function sort(graph) {
		var unvisited = new Set(graph.keys());
		var visited = new Set();
		var order = [];

		function df(nodeId) {
			if (visited.has(nodeId)) {
				return;
			}

			visited.add(nodeId);
			unvisited.delete(nodeId);

			graph.get(nodeId).outputsTo.filter(function (output) {
				return output.to !== '_';
			}).forEach(function (output) {
				df(output.to);
			});

			order.push(graph.get(nodeId));
		}

		while (unvisited.size) {
			df(unvisited.values().next().value);
		}

		return order;
	}

	// just converts a structure (array) to an map (id -> node)
	function toGraph(structure) {
		var graph = new Map();

		structure.forEach(function (node) {
			graph.set(node.id, node);
		});

		return graph;
	}

	// nodes are sorted
	function generateCode(nodeTypes, nodes) {
		// caching compiled templates ("code generators")
		// the same node can be instantiated more than once
		var getCodeGenerator = (function () {
			var generatorsByType = new Map();

			return function (type, body) {
				if (!generatorsByType.has(type)) {
					var codeGenerator = jsTemplate.compile(body);
					generatorsByType.set(type, codeGenerator);
					return codeGenerator;
				}
				return generatorsByType.get(type);
			};
		})();

		function getInputVar(nodeId, varName) {
			return 'inp_' + nodeId + '_' + varName;
		}

		var stringifiedExternals = nodes.filter(function (node) {
			return node.externalInputs;
		}).map(function (node) {
			return node.externalInputs.map(function (externalInput) {
				return externalInput.inputType + ' ' + externalInput.dataType + ' ' + externalInput.externalName + ';';
			}).join('\n');
		}).join('\n');

		function isExternalInput(node, inputName) {
			if (!node.externalInputs) { return true; }

			return !node.externalInputs.some(function (externalInput) {
				return externalInput.externalName !== inputName;
			});
		}

		// declare the inputs of all nodes
		var copyIn = nodes.map(function (node) {
			var nodeDefinition = nodeTypes[node.type];

			return nodeDefinition.inputs.filter(function (input) {
				return isExternalInput(input.name);
			}).map(function (input) {
				return input.type + ' ' + getInputVar(node.id, input.name) + ';';
			}).join('\n');
		}).join('\n');

		var stringifiedNodes = nodes.map(function (node) {
			var nodeDefinition = nodeTypes[node.type];


			// declare outputs of the node
			var outputDeclarations;
			if (nodeDefinition.outputs) {
				outputDeclarations = nodeDefinition.outputs.map(function (output) {
					return '\t' + output.type + ' ' + output.name + ';';
				}).join('\n');
			} else {
				outputDeclarations = '';
			}


			// copy the outputs of this node to the inputs of the next node
			var copyOut = node.outputsTo.map(function (outputTo) {
				return '\t' + getInputVar(outputTo.to, outputTo.input) +
					' = ' + outputTo.output + ';';
			}).join('\n');


			// body
			var bodyGenerator = getCodeGenerator(node.type, nodeDefinition.body);
			var bodyCode = bodyGenerator(node.defines);


			// process inputs (from other shader's outputs)
			var processedBody = nodeDefinition.inputs.filter(function (input) {
				return isExternalInput(node, input.name);
			}).reduce(function (partial, input) {
				// should do a tokenization of the shader coder instead
				// this regex will fail for comments, strings
				return partial.replace(
					new RegExp('\\b' + input.name + '\\b', 'g'),
					getInputVar(node.id, input.name)
				);
			}, bodyCode);


			// process external inputs (direct uniforms)
			if (node.externalInputs) {
				processedBody = node.externalInputs.reduce(function (partial, input) {
					// should do a tokenization of the shader code instead
					// this regex will fail for comments, strings
					return partial.replace(
						new RegExp('\\b' + input.name + '\\b', 'g'),
						input.externalName
					);
				}, processedBody);
			}

			return '// node ' + node.id + ', ' + node.type + '\n' +
				'{\n' +
				outputDeclarations + '\n' +
				'\t' + processedBody + '\n'
				+ copyOut +
				'\n}\n';
		}).join('\n');

    var noise =
             ['vec4 mod289(vec4 x) {',
              '  return x - floor(x * (1.0 / 289.0)) * 289.0;',
              '}',

              'vec3 mod289(vec3 x) {',
              '  return x - floor(x * (1.0 / 289.0)) * 289.0;',
              '}',

              'vec2 mod289(vec2 x) {',
              '  return x - floor(x * (1.0 / 289.0)) * 289.0;',
              '}',

              'float mod289(float x) {',
              '  return x - floor(x * (1.0 / 289.0)) * 289.0; }',

              'vec3 permute(vec3 x) {',
              '  return mod289(((x*34.0)+1.0)*x);',
              '}',

              'vec4 permute(vec4 x) {',
              '  return mod289(((x*34.0)+1.0)*x);',
              '}',
              'float permute(float x) {',
                 '  return mod289(((x*34.0)+1.0)*x);',
              '}',
              'vec4 taylorInvSqrt(vec4 r) {',
              '  return 1.79284291400159 - 0.85373472095314 * r;',
              '}',

              'float snoise(vec3 v) {',
              '  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;',
              '  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);',
              '  vec3 i  = floor(v + dot(v, C.yyy) );',
              '  vec3 x0 =   v - i + dot(i, C.xxx) ;',
              '  vec3 g = step(x0.yzx, x0.xyz);',
              '  vec3 l = 1.0 - g;',
              '  vec3 i1 = min( g.xyz, l.zxy );',
              '  vec3 i2 = max( g.xyz, l.zxy );',
              '  vec3 x1 = x0 - i1 + C.xxx;',
              '  vec3 x2 = x0 - i2 + C.yyy;// 2.0*C.x = 1/3 = C.y',
              '  vec3 x3 = x0 - D.yyy;//      -1.0+3.0*C.x = -0.5 = -D.y',
              '  i = mod289(i); ',
              '  vec4 p = permute( permute( permute( ',
                '  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))',
                '  + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) ',
                '  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));',
              '  float n_ = 0.142857142857;// 1.0/7.0',
              '  vec3  ns = n_ * D.wyz - D.xzx;',
              '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);//   mod(p,7*7)',
              '  vec4 x_ = floor(j * ns.z);',
              '  vec4 y_ = floor(j - 7.0 * x_ );//    mod(j,N)',
              '  vec4 x = x_ *ns.x + ns.yyyy;',
              '  vec4 y = y_ *ns.x + ns.yyyy;',
              '  vec4 h = 1.0 - abs(x) - abs(y);',
              '  vec4 b0 = vec4( x.xy, y.xy );',
              '  vec4 b1 = vec4( x.zw, y.zw );',
              '  vec4 s0 = floor(b0)*2.0 + 1.0;',
              '  vec4 s1 = floor(b1)*2.0 + 1.0;',
              '  vec4 sh = -step(h, vec4(0.0));',
              '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;',
              '  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;',
              '  vec3 p0 = vec3(a0.xy,h.x);',
              '  vec3 p1 = vec3(a0.zw,h.y);',
              '  vec3 p2 = vec3(a1.xy,h.z);',
              '  vec3 p3 = vec3(a1.zw,h.w);',
              '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));',
              '  p0 *= norm.x;',
              '  p1 *= norm.y;',
              '  p2 *= norm.z;',
              '  p3 *= norm.w;',
              '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
              '  m = m * m;',
              '  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );',
              '}',

              'float harmonicSeries(vec3 P){',
              ' float noise = 0.0;',
              ' float scale = 1.0;',
              ' for(float i=0.0; i<4.0 ; i++){',
              '   noise += snoise( P / scale ) * scale;',
              '   scale /= 2.0;',
              ' }',
              ' return noise;',
             '}',

             'float turbulence(vec3 P){',
             '  float noise = 0.0;',
             '  float scale = 1.0;',
             '  for(float i=0.0; i<4.0; i++){',
             '    noise += abs(snoise( P / scale )) * scale;',
             '    scale /= 2.0;',
             '  }',
             '  return noise;',
             '}'
              ].join('\n');


		return stringifiedExternals + 
      '\n\n' + noise + '\n\n' +
      '\n\nvoid main(void) {\n' +
			copyIn + '\n' +
			stringifiedNodes + '\n' +
			'}';
	}

	function buildShader(types, structure) {
		var graph = toGraph(structure);
		var sorted = sort(graph);
		sorted.reverse(); // easier to reverse this than to invert the graph
		return generateCode(types, sorted);
	}

	window.shaderBits = window.shaderBits || {};
	window.shaderBits.buildShader = buildShader;
})();

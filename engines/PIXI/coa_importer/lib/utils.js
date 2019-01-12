
function deepForEach(root, callback, reqProperty){
	root.forEach((node) => {
		callback(node);

		if (node[reqProperty]) deepForEach(node[reqProperty], callback, reqProperty);
	});
}

function forEachNodeInTree(root, callback) {
	deepForEach(root, callback, 'nodes');
}

function sortAllNodesInTree(root, sorter){
	root.sort(sorter);
	root.forEach((node) => {
		if (node.nodes) sortAllNodesInTree(node.nodes, sorter);
	});
}

export { forEachNodeInTree, sortAllNodesInTree, deepForEach };

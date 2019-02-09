/** @format */

/**
 * @brief
 *
 * @Param root root element
 * @Param callback callback func. If once return false, it will stop all cycle
 * @Param reqProperty prop to read from child
 *
 * @Returns
 */
function deepForEach(root, callback, reqProperty) {
	root.forEach((node) => {
		let result = callback(node);
		if (result === false) return;

		if (node[reqProperty]) deepForEach(node[reqProperty], callback, reqProperty);
	});
}

function forEachNodeInTree(root, callback) {
	deepForEach(root, callback, 'nodes');
}

function sortAllNodesInTree(root, sorter) {
	root.sort(sorter);
	root.forEach((node) => {
		if (node.nodes) sortAllNodesInTree(node.nodes, sorter);
	});
}

export { forEachNodeInTree, sortAllNodesInTree, deepForEach };

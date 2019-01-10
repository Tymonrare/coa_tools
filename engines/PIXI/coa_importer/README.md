
coa_tools importer for pixi, [details](https://github.com/Tymonrare/coa_tools) about coa_tools.

# Usage

```javascript
import coa from 'pixi_coa_importer';

coa.loader(
    '/res/samples/', //absolute path to resourses, may be url or anything
    require('/res/samples/test.json')) //json with config
  .then((conf) => {
	let ui = new coa.ui(conf); //create window
	wind.position.set(width / 2, height / 2);
	
	ui.nodes.layer_name; //Access to exportet layers
	ui.nodes.group_name.nodes.layer_name; //Access to nested groups
	
	ui.nodes.button.on('pointerdown', ()=>{console.log('click')}); //buttons works with all pixi events
	ui.nodes.progress.setProgress(0.5); //Set progress bar to half
});

```

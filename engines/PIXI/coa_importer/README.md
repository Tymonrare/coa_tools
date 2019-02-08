
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
	
	ui.layer_name; //Access to exportet layers
	ui.group_name.layer_name; //Access to nested groups
	
	ui.button.on('pointerdown', ()=>{console.log('click')}); //buttons works with all pixi events
	ui.progress.bind = 0.5; //Set progress bar to half
	
	ui.gnodes.label_text; //Access to nodes with flag --global
	
	ui.gbinds.label_text = "Your label"; //Set value of global nodes bind
	ui.gnodes.label_text.bind = "Another label"; //You can access to that prop manually
});

```

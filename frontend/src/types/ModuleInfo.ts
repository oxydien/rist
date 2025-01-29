export default interface ModuleInfo {
	name: string;
	api_routes: {
		[key: string]: string;
	};
	version: string;
	summary: string;
	icon_name: string;
	module_dash_url: string;
}

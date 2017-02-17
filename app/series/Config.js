define([],
	function ()
	{
		configOptions = {
			//The appid for the configured application
			appid: "",
			//The web map id
			webmaps: [
			{
				id: "fe6c30aae735461c8f603acd70a6d891",
				title: "Cultuurhistorische waardenkaart",
				// If your map has time properties, choose to show a single time instance instead of the time interval saved with the web map.
				showSingleTimeInstance: false
			},
				{
				id: "c92ea7fe198b4bfb958b0786bb82c428",
				title: "Archeologische verwachtings-  en beleidsadvieskaart",
				// If your map has time properties, choose to show a single time instance instead of the time interval saved with the web map.
				showSingleTimeInstance: false
			},
			{			
				id: "4bffbeee66124a0ca188da0108283606",
				title: "Stedenbouwkundige periode",
				// If your map has time properties, choose to show a single time instance instead of the time interval saved with the web map.
				showSingleTimeInstance: false
			},
			{			
				id: "a6b660e4f13e4ac8b082f9afe58efe11",
				title: "Straten van Purmerend",
				// If your map has time properties, choose to show a single time instance instead of the time interval saved with the web map.
				showSingleTimeInstance: false
			},
			{			
				id: "13cf696a4aeb40a3b24a2d8dc1561fb9",
				title: "Bouwjaar panden",
				// If your map has time properties, choose to show a single time instance instead of the time interval saved with the web map.
				showSingleTimeInstance: false
			}
			 
			],
			//Enter a title, if no title is specified, the first webmap's title is used.
			title: "Erfgoed Purmerend",
			//Enter a subtitle, if no subtitle is specified, the first webmap's subtitle is used.
			subtitle: "Erfgoed kaart gemeente Purmerend",
			// If false, each tab will have a number on it. If true, the first tab will not have a number and the second tab will start counting at 1.
			startCountOnSecondTab: false,
			//Sync maps scale and location
			syncMaps: false,
			//Display geocoder search widget
			geocoderWidget: false,
			// Specify a proxy for custom deployment
			proxyurl: "",
			//specify the url to a geometry service
			geometryserviceurl: "https://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",
			//If the webmap uses Bing Maps data, you will need to provided your Bing Maps Key
			bingmapskey : "",
			//Modify this to point to your sharing service URL if you are using the portal
			sharingurl: "https://www.arcgis.com/sharing/rest/content/items"
		}
	}
);

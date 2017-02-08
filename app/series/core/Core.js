define(["esri/map",
		"esri/arcgis/utils",
		"esri/layout",
		"esri/widgets",
		"dojo/has",
		"esri/dijit/Geocoder",
		"esri/graphic",
		"esri/symbols/SimpleMarkerSymbol",
		"esri/geometry/screenUtils",
		"dojo/_base/Color",
		"storymaps/utils/Helper",
		"esri/dijit/LocateButton",
		"storymaps/ui/TimeSlider"],
	function(
		Map,
		Utils,
		Layout,
		Widgets,
		Has,
		Geocoder,
		Graphic,
		SimpleMarkerSymbol,
		screenUtils,
		Color,
		Helper,
                LocateButton,
		TimeSlider)
	{
		/**
		 * Core
		 * @class Core
		 *
		 * Geoblog viewer Main class
		 */

			//
			// Initialization
			//

		$(window).resize(function(){
			Helper.resetLayout();
			setAccordionContentHeight();
			responsiveLayout();
			zijbalkhoogteactief();
			legendtoggleactief()
		});

		$(document).ready(function(){
			Helper.resetLayout();
			$(".loader").fadeIn();
			zijbalkhoogteactief();
			legendtoggleactief()
		});

		function init()
		{
			app = {
				maps: [],
				currentMap: null
			};

			if (!configOptions.sharingurl) {
				if(location.host.match("localhost") || location.host.match("storymaps.esri.com") || location.host.match("esri.github.io"))
					configOptions.sharingurl = "https://www.arcgis.com/sharing/rest/content/items";
				else
					configOptions.sharingurl = location.protocol + '//' + location.host + "/sharing/content/items";
			}

			if (configOptions.geometryserviceurl && location.protocol === "https:")
				configOptions.geometryserviceurl = configOptions.geometryserviceurl.replace('http:', 'https:');

			esri.arcgis.utils.arcgisUrl = configOptions.sharingurl;
			esri.config.defaults.io.proxyUrl = configOptions.proxyurl;
			esri.config.defaults.geometryService = new esri.tasks.GeometryService(configOptions.geometryserviceurl);

			var urlObject = esri.urlToObject(document.location.href);
			urlObject.query = urlObject.query || {};

			if ($("#application-window").width() > 767 && urlObject.query.embed || urlObject.query.embed === "") {
				$("#banner").hide();
			}

			//is an appid specified - if so read json from there
			if(configOptions.appid || (urlObject.query && urlObject.query.appid)){
				var appid = configOptions.appid || urlObject.query.appid;
				var requestHandle = esri.request({
					url: configOptions.sharingurl + "/" + appid + "/data",
					content: {f:"json"},
					callbackParamName:"callback",
					load: function(response){
						if(response.values.title !== undefined){configOptions.title = response.values.title;}
						if(response.values.subtitle !== undefined){configOptions.subtitle = response.values.subtitle;}
						if(response.values.webmap !== undefined) {configOptions.webmaps = Helper.getWebmaps(response.values.webmap);}
						if(response.values.mapTitle !== undefined) {
							dojo.forEach(Helper.getWebmapTitles(response.values.mapTitle),function(item,i){
								if(configOptions.webmaps[i])
									configOptions.webmaps[i].title = item;
							});
						}
						if(response.values.syncMaps !== undefined) {configOptions.syncMaps = response.values.syncMaps;}

						loadMaps();
						initBanner();
					},
					error: function(response){
						var e = response.message;
						alert("Error: " +  response.message);
					}
				});
			}
			else{
				loadMaps();
				initBanner();
			}
		}

		function initBanner()
		{
			$("#title").html(configOptions.title);
			$("#subtitle").html(configOptions.subtitle);

			if (configOptions.webmaps.length < 2){
				$("#mobile-navigation-left").hide();
				$("#mobile-navigation").hide();
				Helper.resetLayout();
			}

			//First layout setup called on app load
			Helper.resetLayout();
			responsiveLayout();
		}

		function loadMaps()
		{
			$("#map-pane").append('<div id="map'+app.maps.length+'" class="map"></div>');
			$("#legend-pane").append('<div id="legend'+app.maps.length+'" class="legend"></div>');
			$("#mobile-popup").append('<div class="mobile-popup-content"></div>');
			$(".map").last().fadeTo(0,0);

			//Highlights the object that belongs to the popup
			var popup = new esri.dijit.Popup({
				'markerSymbol': new esri.symbol.SimpleLineSymbol('solid', new dojo.Color([84,84,84],1),2),
				'lineSymbol': new esri.symbol.SimpleLineSymbol('solid', new dojo.Color([84,84,84],1),3),
				fillSymbol: new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([84,84,84]), 3), new dojo.Color([255,255,0,0]))
			}, dojo.create("div"));

			var mapDeferred = esri.arcgis.utils.createMap(configOptions.webmaps[app.maps.length].id,"map"+app.maps.length,{
				mapOptions: {
					extent: getExtent(),
					infoWindow: popup
				},
				bingMapsKey: configOptions.bingmapskey
			});

			mapDeferred.addCallback(function(response){

				var map = response.map;
				map.itemData = {
					title: configOptions.webmaps[app.maps.length].title || response.itemInfo.item.title || "",
					description: response.itemInfo.item.description || ""
				};

				if (response.itemInfo.itemData.widgets && response.itemInfo.itemData.widgets.timeSlider) {
					$("#time-pane").append('<div id="slider'+app.maps.length+'" class="time-slider"></div>');
					new TimeSlider("slider" + app.maps.length, map, response.itemInfo.itemData.widgets.timeSlider.properties,configOptions.webmaps[app.maps.length].showSingleTimeInstance);
				}

				app.maps.push(map);
				updateMobileNavigation();

				var layers = esri.arcgis.utils.getLegendLayers(response);

				if (map.loaded){
					if(app.maps.length <= configOptions.webmaps.length){
						if(app.maps.length < configOptions.webmaps.length){
							loadMaps();
						}
						createAppItems(map, layers, app.maps.length - 1);
					}
				}
				else {
					dojo.connect(map, "onLoad", function() {
						if(app.maps.length <= configOptions.webmaps.length){
							if(app.maps.length < configOptions.webmaps.length){
								loadMaps();
							}
							createAppItems(map, layers, app.maps.length - 1);
						}
					});
				}

				dojo.connect(map,"onUpdateEnd",function(){
					if (!map.firstLoad){
						map.firstLoad = true;
						setAccordionContentHeight();
						if(map === app.maps[0]){
							appReady();
						}
					}
				});

				dojo.connect(map,"onExtentChange",function(){
					if (configOptions.syncMaps && map === app.currentMap){
						Helper.syncMaps(app.maps,app.currentMap,map.extent);
					}
				});

				dojo.connect(map.infoWindow,"onShow",function(){
					var mapIndex = $.inArray(map,app.maps);
					if($("#application-window").width() <= 767){
						if($(".mobile-popup-content").eq(mapIndex).html() === ""){
							$(".mobile-popup-content").each(function(i){
								$(this).append($(".contentPane").eq(i));
							});
						}
						$("#header-text").stop(true,true).slideUp();
						$("#legend-pane").stop(true,true).slideUp();
						$(".mobile-popup-content").eq(mapIndex).show();
						$("mobile-popup").slideDown();
						$("#close-mobile-popup").show();
					}
					else{
						if($(".esriPopup .sizer.content").eq(mapIndex).html() === ""){
							$(".esriPopup .sizer.content").each(function(i){
								$(this).append($(".contentPane").eq(i));
							});
						}
					}
				});

				dojo.connect(map.infoWindow,"onHide",function(){
					$(".mainSection").scrollTop(0);
					$(".mobile-popup-content").scrollTop(0);
					$(".contentPane").scrollTop(0);
					$(".mobile-popup-content").hide();
					$("mobile-popup").hide();
					$("#close-mobile-popup").hide();
				});

				var menuboom = 'geen';
				$(document).ready(
					function(){
						$("body").off("click", "#menuheaderthema");
						$("body").on("click", "#menuheaderthema", function(){toggleMenu('thema')});
						$("body").off("click", "#menuheaderonderzoek");
						$("body").on("click", "#menuheaderonderzoek", function(){toggleMenu('onderzoek')});
						document.title = configOptions.title;
					}
				);


				function toggleMenu(menuitem){
					menuboom = menuboom != menuitem ? menuitem : 'geen';
					if(menuboom == 'onderzoek')
					{
						$("#pijlonderzoek").addClass("omhoog");
						$("#menuheaderonderzoek").addClass("actief");
						$("#menuboomonderzoek").slideToggle(400);

						slideUpThema();
					}
					else if(menuboom == 'thema')
					{
						$("#pijlthema").addClass("omhoog");
						$("#menuheaderthema").addClass("actief");
						$("#menuboomthema").slideToggle(400);

						slideUpWaarden();
						slideUpOnderzoek();
					}
					else if(menuboom == 'geen')
					{
						slideUpThema();
						slideUpWaarden();
						slideUpOnderzoek();
					}
				}

				function slideUpThema(){
					$("#menuboomthema").slideUp(400);
					$("#pijlthema").removeClass("omhoog");
					$("#menuheaderthema").removeClass("actief");
				}


				function slideUpOnderzoek(){
					$("#menuboomonderzoek").slideUp(400);
					$("#pijlonderzoek").removeClass("omhoog");
					$("#menuheaderonderzoek").removeClass("actief");
				}

				function slideUpWaarden(){
					$("#menuboomwaardenkaart").slideUp(400);
					$(".pijlwaarden").removeClass("omhoog");
				}

				$("#menutak a").each(function() {
					if (this.href == window.location.href) {
						$(this).closest('div').addClass("active-sidebar-link");
					}
				});

				$("#application-window").on("click", function()
				{
					if ($('div').is("div.esriPopup.esriPopupMaximized")) {
						$(".esriPopupMediaImage").css("max-width", "100%");
						$(".esriPopupMediaImage").css("max-height", "100%");
						$(".gallery").css("max-height","100%");
						$(".gallery").css("width","auto");
						$(".sizer").css("width","100%");
						$(".esriPopupWrapper").removeAttr("style");
					}
					if (!$('div').is("div.esriPopup.esriPopupMaximized")) {
						$(".esriPopupMediaImage").removeAttr("style");
						$(".gallery").removeAttr("style");
						$(".sizer").removeAttr("style");
						$(".contentPane").removeAttr("style");
						$(".esriPopupWrapper").css("position","absolute");
					}
				});

				$(".titleButton.close").click(function () {
					$(".esriPopupMediaImage").removeAttr("style");
					$(".gallery").removeAttr("style");
					$(".sizer").removeAttr("style");
					$(".contentPane").removeAttr("style");
					$(".esriPopupWrapper").css("position","absolute");
					$(".esriPopup.esriPopupMaximized").removeClass("esriPopupMaximized");
				});

				$(".accordion-header").click(function () {
					hidePopups();
					$(".esriPopup.esriPopupMaximized").removeClass("esriPopupMaximized");
				});

				$(document).ready(
					function(){
						$("body").off('click', ".onderzoekwaarden");
						$("body").on('click', ".onderzoekwaarden",
							function(){
								$("#menuboomwaardenkaart").slideToggle();
								$(".pijlwaarden").toggleClass("omhoog");
							}
						);
					}
				);

				$(".onderzoekwaarden").mouseenter(function(){
					$("#menuboomwaardenkaart").slideDown();
					$(".pijlwaarden").addClass("omhoog");
				});

				$(".onderzoekwaarden").mouseleave(function(){
					$("#menuboomwaardenkaart").slideUp();
					$(".pijlwaarden").removeClass("omhoog");
				});


				$(function(){
					$("body").off("click", "#legend-toggle");
					$("body").on("click", "#legend-toggle",
						function(){
							$( "div.pijllegenda" ).toggleClass("omhoog");
							$(".legend-toggle" ).toggleClass("legend-toggle-actief");
						}
					)
				});


				createAccordionPanel(app.maps.length,response);

			});
		}

		function getExtent()
		{
			if(configOptions.syncMaps && app.maps.length > 0){
				return (app.maps[0].extent);
			}
		}

		function createAppItems(map,layers,index)
		{
			//ADD INITIAL EXTENT BUTTON TO MAPS
			$(".esriSimpleSliderIncrementButton").last().addClass("zoomButtonIn").after("<div class='esriSimpleSliderIncrementButton initExtentButton'><img style='margin-top:5px' src='resources/images/app/home.png'></div>");
			$(".initExtentButton").last().click(function(){
				map.setExtent(map._mapParams.extent);
			});

			if(configOptions.geocoderWidget){
				$("#" + map.container.id).append('<div id="'+map.container.id+'geocoder" class="geocoderWidget"></div>');
				var geocoder = new esri.dijit.Geocoder({
					arcgisGeocoder: {
						placeholder: "Zoek een locatie"
					},
					autoComplete: true,
					map: map
				},map.container.id+'geocoder');
				geocoder.startup();

				geocoder.on("select", function(evt) {
					map.graphics.clear();
					var point = evt.result.feature.geometry;
					var symbol = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setOutline(null).setSize("12").setColor(new Color([247, 107, 0, 0.7]));
					var graphic = new Graphic(point, symbol);
					map.graphics.add(graphic);
					map.infoWindow.setTitle("Resultaat");
					map.infoWindow.setContent(evt.result.name);
					map.infoWindow.show(evt.result.feature.geometry);
					map.infoWindow.on('hide', function() {
						map.graphics.clear();
					});
				});
			}

$("#" + map.container.id).append('<div id="'+map.container.id+'locateButton"></div>');
geoLocate = new LocateButton({
  map: map
}, map.container.id+'locateButton');
geoLocate.startup();

			//ADD LEGEND
			if(layers.length > 0)
			{
				// Create legend for all layers (even invisible ones)
				var save = saveVisibility(layers);
				var legend = new esri.dijit.Legend({map:map}, "legend" + index);
				legend.startup();
				restoreVisibility(layers, save);
				placeCheckboxes(map, index, layers);

				// Replace refresh with a refresh that refreshes all layers (even invisible ones)
				legend.orgRefresh = legend.refresh;
				legend.refresh = function()
				{
					var save = saveVisibility(layers);
					legend.orgRefresh();
					restoreVisibility(layers, save);
					placeCheckboxes(map, index, layers);
				}
			}
			else
			{
				$(".legend").eq(index).html("Deze kaart heeft geen lagen om weer te geven in de legenda.");
			}
		}

		function placeCheckboxes(map, index, layers)
		{
			dojo.forEach(layers, function (layer)
			{
				if(layer.layer.visibleAtMapScale)
				{
					var checkBox = new dijit.form.CheckBox(
						{
							name     : "checkBox" + index + "_" + layer.layer.id,
							value    : layer.layer.id,
							checked  : layer.layer.visible,
							onChange : function (evt)
							{
								var clayer = map.getLayer(this.value);
								clayer.setVisibility(!clayer.visible);
								this.checked = clayer.visible;
							}
						});
					dojo.place(checkBox.domNode, dojo.byId("legend" + index + "_" + layer.layer.id), "before");
				}
			});
		}

		function saveVisibility(layers)
		{
			var save = [];
			for(i=0;i<layers.length;i++) { save[i] = layers[i].layer.visible; layers[i].layer.visible=true; }
			return save;
		}

		function restoreVisibility(layers, save)
		{
			for(i=0;i<layers.length;i++) { layers[i].layer.visible = save[i]; }
		}

		function appReady()
		{
			//Show Map
			changeSelection(0);

			$("#mobile-navigation").click(function(){
				changeSelection($(this).attr("map-link"));
			});
			$("#mobile-navigation-left").click(function(){
				changeSelection($(this).attr("map-link"));
			});

			//Hide loader
			$(".loader").fadeOut();

			app.currentMap = app.maps[0];

			$("#mobileheadertext").html(app.currentMap.itemData.title);

			$("#header-text").slideDown();

			//Set state of accordion
			$(".accordion-content").first().slideDown();
			$(".accordion-header").first().addClass("active");

			$("#mobile-header").click(function(){

				hidePopups();
				$("#side-pane").stop(true,true).slideToggle("400",setAccordionContentHeight);
				$(".pijlaccordion").toggleClass("omhoog");
			});

			$(".legend-toggle").click(function(){

				if(Has("ie") <= 8){
					$("#legend-pane").toggle();
				}
				else{
					$("#legend-pane").stop(true,true).slideToggle(400,function(){
						if($("#application-window").width() <= 767){
							if($("#legend-pane").is(":visible")){
								$("#close-mobile-legend").show();
							}
							else{
								$("#close-mobile-legend").hide();
							}
						}
					});
				}
			});

			$(".intro-toggle").click(function(){

				hidePopups();
				$("#header-text").stop(true,true).slideToggle();
			});

			$(".mobile-popup-toggle").click(function(){

				hidePopups();
			});

			$(".map-toggle").click(function(){

				hidePopups();
				$("#side-pane").stop(true,true).slideUp();
				$("#legend-pane").stop(true,true).slideUp();
			});
		}

		function hidePopups()
		{

			dojo.forEach(app.maps,function(map){
					map.infoWindow.hide();
				}
			);

		}


		function changeSelection(index)
		{
			var speed = 400;

			app.currentMap = app.maps[index];
			updateMobileNavigation();

			$("#mobileheadertext").html(app.currentMap.itemData.title);

			if(!$(".accordion-header").eq(index).hasClass("active")){
				$(".accordion-header.active").removeClass("active").next().slideUp(speed);
				$(".accordion-header").eq(index).addClass("active").next().slideDown(speed);
				selectMap(index,speed);
			}

			$(".legend").hide();
			$(".legend").eq(index).show();
			$(".esriTimeSlider").hide();
			$("#slider" + index).show();
		}

		function selectMap(mapIndex,speed)
		{
			$(".map").not($(".map").eq(mapIndex)).removeClass("active").fadeTo(speed,0);
			$(".map").eq(mapIndex).addClass("active").fadeTo(speed,1);
			dojo.forEach(app.maps,function(map){
				map.reposition();
			});
		}

		function createAccordionPanel(index,response)
		{
			if(configOptions.startCountOnSecondTab){
				var num = (index == 1 ? "" : index - 1),
					setHeight = (index == 1 ? " style='min-height:72px'" : "");
				title = configOptions.webmaps[index - 1].title || response.itemInfo.item.title || "";
				description = response.itemInfo.item.description || "";
				$("#side-pane").append('<div class="accordion-header"><div class="accordion-header-arrow"></div><table' + setHeight + '><tr><td class="accordion-header-number">' + '</td><td class="accordion-header-title">' + title + '</td></tr></table></div>');
				$("#side-pane").append('<div class="accordion-content">' + description + '</div>');
			}
			else{
				var num = index,
					title = configOptions.webmaps[index - 1].title || response.itemInfo.item.title || "",
					description = response.itemInfo.item.description || "";
				$("#side-pane").append('<div class="accordion-header"><div class="accordion-header-arrow"></div><table><tr><td class="accordion-header-number">' + '</td><td class="accordion-header-title">' + title + '</td></tr></table></div>');
				$("#side-pane").append('<div class="accordion-content">' + description + '</div>');
			}

			$(".accordion-header").last().click(function(){
				changeSelection(index - 1);
				if($(this).hasClass("active") && $("#application-window").width() <= 767 && $(this).next().height() > 20){
					$("#side-pane").slideUp();
				}
			});

			setAccordionContentHeight();
		}




		function zijbalkhoogteactief()
		{
			var zijbalk = ($("#content").height() - 100 );
			$("#side-pane").css('max-height', zijbalk);
		}


		function legendtoggleactief()
		{
			if ($('#legend-pane' || '.legend-pane').is(":visible")) {
				$(".legend-toggle").addClass("legend-toggle-actief");
				$("div.pijllegenda").addClass("omhoog");
			}
			if ($('#legend-pane' || '.legend-pane').is(':hidden')) {
				$('.legend-toggle').removeClass('legend-toggle-actief');
				$( "div.pijllegenda" ).removeClass("omhoog");
			}
		}


		function setAccordionContentHeight()
		{
			var height = 0,
				compareHeight = $("#side-pane").outerHeight();


			$(".accordion-header").each(function(){
				height += $(this).outerHeight();
			});

			if (compareHeight - height - 1 < 200){
				$(".accordion-content").css("height","auto");
			}
			else{
				$(".accordion-content").outerHeight(compareHeight - height - 1);
			}

		}

		function responsiveLayout()
		{
			var appWidth = $("#application-window").width();
			var widthmobileheader = ($("#content").width() - 126 );
			var mobilepopupheight = ($("#content").height() - 136 );


			hidePopups();

			if (appWidth <= 767){
				$("#side-pane").after($("#menuboomthema"));
				$("#menuboomthema").after($("#legend-pane"));
				$("#mobileheadertext").css('max-width', widthmobileheader);
				$(".mobile-popup-content").css('max-height', mobilepopupheight);
			}
			else{
				$("#menurechts").after($("#menuboomthema"));
				$("#legend-wrapper").after($("#legend-pane"));
				$("#side-pane").show();
			}
		}


		function updateMobileNavigation()
		{
			if ($.inArray(app.currentMap,app.maps) < app.maps.length - 1){
				$("#mobile-navigation-content").html("Next map: " + app.maps[$.inArray(app.currentMap,app.maps) + 1].itemData.title);
				$("#mobile-navigation").attr("map-link",$.inArray(app.currentMap,app.maps) + 1);
				$("#mobile-navigation-left").attr("map-link",$.inArray(app.currentMap,app.maps) - 1);
			}
			else{
				$("#mobile-navigation-content").html("Back to first map");
				$("#mobile-navigation").attr("map-link",0);
				$("#mobile-navigation-left").attr("map-link",0);
			}
		}

		return {
			init: init
		}
	}
);
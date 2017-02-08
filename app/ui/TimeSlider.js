define(["dojo/dom","dojo/on","dojo/date/locale","esri/dijit/TimeSlider","storymaps/utils/Helper"], function(dom,on,locale,Slider,Helper){
	/**
	 * Time Slider
	 * @class Time Slider
	 *
	 * NOTE: Requires Jquery
	 */
	return function TimeSlider(selector,map,timeProperties,showSingleTimePoint){
		
		//  $("#" + selector).append('\
		// 	<div class="time-string"></div>\
		// 	<div class="slider"></div>');
		
		// var _timeStrEl = $("#" + selector + " .time-string");
		// var _sliderEl = $("#" + selector + " .slider");

		// var _dateProperties = getDatePattern(timeProperties.timeStopInterval);

		var slider = new Slider({
			style: "width: 100%;"
		},dom.byId(selector));
		var startTime = timeProperties.startTime;
		var endTime = timeProperties.endTime;
		var fullTimeExtent = new esri.TimeExtent(new Date(startTime), new Date(endTime));

		map.setTimeExtent(fullTimeExtent);
		map.setTimeSlider(slider);

		if (showSingleTimePoint){
			timeProperties.thumbCount = 1;
			slider.singleThumbAsTimeInstant(true);

		}

		slider.setThumbCount(timeProperties.thumbCount);
		slider.setThumbMovingRate(timeProperties.thumbMovingRate);

		if (timeProperties.numberOfStops) {
			slider.createTimeStopsByCount(fullTimeExtent, timeProperties.numberOfStops);
		}
		else {
			slider.createTimeStopsByTimeInterval(fullTimeExtent, timeProperties.timeStopInterval.interval, timeProperties.timeStopInterval.units);
		}

		if (timeProperties.thumbCount === 2) {
			slider.setThumbIndexes([0, 1]);
			$("#" + selector).addClass("time-range");
		}
		else if(timeProperties.thumbCount === 1){
			$("#" + selector).addClass("time-instance");
		}
		else{
			$("#" + selector).addClass("time-progressive");
		}
		
		slider.startup();
		var playButton = $('<div class="play-time"><div class="play-arrow"></div><div class="pause-icon"></div></div>');
		var rewind = $('<div class="rewind-time"><div class="rewind-arrow"></div><div class="rewind-block"></div></div>');
		var fastForward = $('<div class="fastForward-time"><div class="fastForward-arrow"></div><div class="fastForward-block"></div></div>');
		var timeDisplay = $('<h6 class="time-display"></h6>');
		$("#" + selector + ".esriTimeSlider td[align=right]").addClass("fixed-width").empty().append(playButton);
		$("#" + selector + ".esriTimeSlider td[width=30]").addClass("fixed-width").empty().append(rewind);
		$("#" + selector + ".esriTimeSlider td:last").addClass("fixed-width").empty().append(fastForward);
		$("#" + selector + ".esriTimeSlider .tsTmp").append(timeDisplay);

		timeDisplay.html(getTimeString(slider.getCurrentTimeExtent()));

		$("#time-pane").css({
			"height": 78
		});
		Helper.resetLayout();
		map.resize();
		map.reposition();

		playButton.click(function(){
			if ($(this).hasClass("paused")){
				stopAnimation();
			}
			else{
				playAnimation();
			}
		});

		rewind.click(function(){
			stopAnimation();
			slider.previous();
		});

		fastForward.click(function(){
			stopAnimation();
			slider.next();
		});

		$("#" + selector + ".esriTimeSlider .dijitSliderImageHandle").append('<div class="slider-handle"></div></div><div class="slider-handle-point-border"></div><div class="slider-handle-point"></div>');

		slider.on('time-extent-change',function(timeExtent){
			timeDisplay.html(getTimeString(timeExtent));
			window.test = slider;
			setTimeout(function(){
				if (!slider.loop){
					if (slider.thumbCount === 1 && slider.thumbIndexes[0] === slider.timeStops.length - 1){
						stopAnimation();
					}
					else if (slider.thumbCount === 2 && slider.thumbIndexes[1] === slider.timeStops.length - 1){
						stopAnimation();
					}
				}
			},100);
			slider.pause();
			on.once("update-end",function(){
				if(playButton.hasClass("paused")){
					slider.play();
				}
			});
		});

		function stopAnimation()
		{
			playButton.removeClass("paused");
			slider.pause();
		}

		function playAnimation()
		{
			if (slider.thumbCount === 1 && slider.thumbIndexes[0] === slider.timeStops.length - 1){
				slider.setThumbIndexes([0, 1]);
			}
			else if (slider.thumbCount === 2 && slider.thumbIndexes[1] === slider.timeStops.length - 1){
				slider.setThumbIndexes([0, 1]);
			}
			playButton.addClass("paused");
			slider.play();
		}

		function getTimeString(timeExtent)
		{
			var datePattern;
			var timeString;
			
			if (timeProperties.timeStopInterval && timeProperties.timeStopInterval.units){

				switch (timeProperties.timeStopInterval.units) {
				case 'esriTimeUnitsCenturies':
					datePattern = 'yyyy G';
					break;
				case 'esriTimeUnitsDecades':
					datePattern = 'yyyy';
					break;
				case 'esriTimeUnitsYears':
					datePattern = 'yyyy';
					break;
				case 'esriTimeUnitsWeeks':
					datePattern = 'MMMM d, yyyy';
					break;
				case 'esriTimeUnitsDays':
					datePattern = 'MMMM d, yyyy';
					break;
				case 'esriTimeUnitsHours':
					datePattern = 'h a';
					break;
				case 'esriTimeUnitsMilliseconds':
					datePattern = 'h:mm:ss:SSS a';
					break;
				case 'esriTimeUnitsMinutes':
					datePattern = 'h:mm a';
					break;
				case 'esriTimeUnitsMonths':
					datePattern = 'MMMM y';
					break;
				case 'esriTimeUnitsSeconds':
					datePattern = 'h:mm:ss a';
					break;
				}

				if (showSingleTimePoint){
					timeString = formatDate(timeExtent.startTime, datePattern);
				}
				else{
					timeString = formatDate(timeExtent.startTime, datePattern) + " to " + formatDate(timeExtent.endTime, datePattern);
				}

			}
			else{
				datePattern = 'MMMM d, yyyy';
				 timeString = formatDate(timeExtent.endTime, datePattern);
			}

			return timeString;
		}

		function formatDate(date, datePattern)
		{
			var dateObj = date;
			
			if(!(date instanceof Date)){
				dateObj = new Date(date);
			}

			return locale.format(dateObj,{
				selector: 'date',
				datePattern: datePattern
			});
		}

	}
});
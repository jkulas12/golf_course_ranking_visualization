/**
 * Created by joshuakulas on 9/6/16.
 */
//////////////////////////////
// global mapping variables //
//////////////////////////////
var tile;
var raster;
var zoom;

var svg;
var pi = Math.PI,
    tau = 2 * pi;

var projection;
var rubberBand;


var annotG;

var mapCourses;
///////////////////////////
// global data variables //
///////////////////////////

var RANKINGS_PATH = 'Data/Rankings/';
// all datasets to be loaded
var all_rankings = [
    "Golf_2002_Public",
    "Golf_2003_All",
    "Golf_2004_Public",
    "Golf_2005_All",
    "Golf_2006_Public",
    "Golf_2007_All",
    "Golf_2008_Public",
    "Golf_2009_All",
    "Golf_2010_Public",
    'Golf_2011_All',
    "Golf_2012_Public",
    "Golf_2013_All",
    'Golf_2014_Public',
    "Golf_2015_All",
    "Golf_2016_Public",
    "GDigest_2001_All",
    "GDigest_2003_All",
    "GDigest_2005_All",
    "GDigest_2005_Public",
    "GDigest_2007_All",
    "GDigest_2007_Public",
    "GDigest_2009_Public",
    "GDigest_2009_All",
    "GDigest_2011_All",
    "GDigest_2011_Public",
    "GDigest_2013_All",
    "GDigest_2013_Public",
    "GDigest_2015_All",
    "GDigest_2015_Public"
];


// mapping from publication display_name -> class_name
var pub_display_class_map = {
    "GDigest" : "Golf Digest",
    "Golf" : 'Golf Mag.'

};

var lineColors = {

    'GDigest_All' : "#0000E6",
    'GDigest_Public' : "#E60000" ,
    'Golf_All' : "#80B3ff",
    'Golf_Public' : "#FF8080"

};



// map of all courses
course_map = {};

// map of all architects
architect_map = {};

// map of all rankings
ranking_map = {};

// list of all selected courses (selected on courseList)
var selectCourses = [];


// all points displayed on map
// global tooltip object
var tooltip;

var lineGen = d3.line()
    .x(function(d) {
        return xScale(parseInt(d.year));
    })
    .y(function(d) {
        return yScale(d.rank);
    });




var wt = d3.transition()
    .duration(500);

// ensure that when the map is resized the map resizes
$(window).on("resize", function() {
    var resize_height = $(window).height();
    var resize_width = $(window).width();
    $("#main").height(resize_height)
        .width(resize_width);
    rightControlResize();
    d3.select('#map')
        .style("width", resize_width)
        .style("height", resize_height);
    d3.select('#mapContainer')
        .style("width", resize_width + 'px')
        .style("height", resize_height + 'px');
});
$(window).on("load", function() {
    var h = $(window).height();
    var w = $(window).width();
    $("#main").height(h)
        .width(w);
    load_all_rankings(all_rankings);

    generate_map();
    rightControlResize();

});






// function to load all rankings
// populates 3 maps: course_map, architect_map and ranking_map
function load_all_rankings(rankings) {
    var ranking_index = 0;
    rankings.forEach(function(d) {
        ranking_index++;
        var ranking_path = RANKINGS_PATH +  d;
        // parse out ranking_name from ranking_path
        var ranking_name = ranking_path.split("/")[2];

        // load specific ranking
        d3.json(ranking_path + ".json", function(json) {
            // array of all courses in this ranking
            var ranking_courses = [];

            // object for publication metadata
            var publication = {
                className : createClassName(json.Publication),
                displayName : json.Publication
            };
            // metadata of specific ranking
            var ranking = {
                className : ranking_name,
                publication : publication,
                year : json.Year,
                type : json.Type,
                courses : {}
            };
            // iterate through all courses in a ranking
            json.Courses.forEach(function(c) {
                // create class name for given course
                var course_class_name = createClassName(c.CourseName);
                // key value pair for a course ranking {course_class_name : rank}
                var course_ranking = {};
                course_ranking[course_class_name] = c.Ranking;

                // ranking for a given publication: {ranking_name : rank}
                var publication_ranking = {};
                publication_ranking[ranking_name] = c.Ranking;
                // check to see if course exists in course_map
                // if course does not exist in the map
                if (!course_map.hasOwnProperty(course_class_name)) {
                    var course_architects = [];
                    // check to see if a coure has more than one architect
                    if (c.Architect.indexOf("_") > -1) {
                        var archs = c.Architect.split("_");
                        // add all unmapped architects to map
                        archs.forEach(function(a) {
                            var arch_class_name = createClassName(a);
                            // if architect does not exist, add to map
                            if (!architect_map.hasOwnProperty(arch_class_name)) {
                                architect_map[arch_class_name] = {
                                    displayName : a,
                                    className : arch_class_name,
                                    count : 1,
                                    courses : [course_class_name]
                                };
                            } else {
                                // add course to list of courses by an architect
                                architect_map[arch_class_name]['courses'].push(course_class_name);
                                // increment counter of courses
                                architect_map[arch_class_name]['count']++;
                            }
                        });
                        // if only one architect, check to see if architect is already in map
                    } else {
                        var arch_class_name = createClassName(c.Architect);
                        if (!architect_map.hasOwnProperty(arch_class_name)) {
                            architect_map[arch_class_name] = {
                                displayName : c.Architect,
                                className : arch_class_name,
                                count : 1,
                                courses : [course_class_name]
                            }
                        } else {
                            // add course to list of courses by an architect
                            architect_map[arch_class_name]['courses'].push(course_class_name);
                            // increment counter of courses
                            architect_map[arch_class_name]['count']++;
                        }
                        var archs = [c.Architect]
                    }
                    // architects have been handled, on to adding the course
                    var course_years;

                    // type check years
                    // if type is not string, it is numeric and we need to make string
                    if (typeof c.Year !== 'string') {
                        course_years = String(c.Year)
                    } else {
                        course_years = c.Year;
                    }


                    // check to see if multiple or just one year, either way make array
                    if (course_years.indexOf("_") > -1) {
                        course_years = course_years.split("_")
                    } else {
                        course_years = [course_years]
                    }

                    // type check coordinates
                    if (typeof c.Coordinates === 'string') {
                        // remove brackets
                        c.Coordinates = c.Coordinates.replace("[", "").replace("]", "")
                        // transform to array of just values
                        c.Coordinates = c.Coordinates.split(",")
                    }
                    var course = {
                        displayName : c.CourseName,
                        className : course_class_name,
                        yearCreated : course_years,
                        rankings : publication_ranking,
                        coordinates : c.Coordinates,
                        x : c.Coordinates[1],
                        y : c.Coordinates[0],
                        architects : archs.map(function(d) {return createClassName(d)}),
                        type : c.Type
                    };
                    course_map[course_class_name] = course;
                    // when a course already exists in course_map
                } else {
                    var course = course_map[course_class_name];
                    // add ranking information for current ranking
                    course.rankings[ranking_name] = c.Ranking
                }
                // finally, add course to ranking
                // ranking for a specific course.
                // of the form {course_class_name : rank}
                ranking.courses[c.CourseName] = c.Ranking;
                // TODO: go through courses in an architect and remove duplicates
            });
            ranking_map[ranking_name] = ranking;
        });
        // check to see if we have visited every ranking
        if (ranking_index === all_rankings.length) {
            ///////////////////////////////////////////////
            /////// integrate slope and rating data ///////
            ///////////////////////////////////////////////
            d3.csv('Data/supplemental/slopeRatingYardageData.csv', function(slopeData) {
                slopeData.forEach(function(c) {
                    // TODO: figure out why some courses are not in map yet(?)
                    var course_class_name = createClassName(c.name);
                    if (Object.keys(course_map).indexOf(course_class_name) !== -1) {
                        course_map[course_class_name]['slope'] = +c.slope;
                        course_map[course_class_name]['par'] = +c.par;
                        course_map[course_class_name]['rating'] = +c.rating;
                        course_map[course_class_name]['yardage'] = +c.yardage;
                    } else {
                        // TODO: figure out why this is happening and courses arent visited
                        console.log("couldn't find course: " + course_class_name);
                    }
                });
                /////////////////////////////////////////////
                /// compute and integrate chart data ////////
                /////////////////////////////////////////////
                for (var c in course_map) {
                    var course_rankings = {};
                    for (var r in course_map[c].rankings) {
                        var ranking = r;
                        // split ranking for publication, type and year
                        var split_ranking = ranking.split("_");
                        // ranking in format pub_type
                        var chart_ranking = split_ranking[0] + "_" + split_ranking[2];
                        // if the course does not already have a ranking for this pub_type combo
                        if (!course_rankings.hasOwnProperty(chart_ranking)) {
                            course_rankings[chart_ranking] = {
                                displayName : split_ranking[0] + " " + split_ranking[2],
                                className : split_ranking[0] + "_" + split_ranking[2],
                                ranks : [{
                                    year : +split_ranking[1],
                                    rank : course_map[c].rankings[ranking],
                                    displayName : split_ranking[0] + " " + split_ranking[2],
                                    className : split_ranking[0] + "_" + split_ranking[2]
                                }]
                            };
                            // if the course already has a ranking for pub_type combo
                        } else {
                            course_rankings[chart_ranking].ranks.push({
                                year : +split_ranking[1],
                                rank : course_map[c].rankings[ranking],
                                className : split_ranking[0] + "_" + split_ranking[2],
                                displayName : split_ranking[0] + " " + split_ranking[2]

                            });
                        }
                    }
                    course_map[createClassName(c)]['chart_data'] = course_rankings
                }
                //////////////////////////////////////////////////////////////////
                ////////// Code here for events after data is loaded /////////////
                //////////////////////////////////////////////////////////////////

                tooltip = d3.select("#mapContainer").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);
                initialize_chart();
                initialize_container_lists();
                add_check_boxes();
                initialize_publication_year_widget();
                initialize_course_year_slider();
                initialize_selectable();
                refresh_map();

            });
        }
    });
}


// TODO
// function to initialize tooltip
function initialize_tooltip() {

}


// function to bind all selection handlers to list and headers
function initialize_selectable() {

    // map to keep track of architects for a selected course
    var courseCount = {};
    var archCount = {};

    // bind selectable functionality for courses header
    $('.coursesHeadingDiv').selectable({
        selected : function(event, ui) {
            // reset selection
            $('.ui-selected').removeClass('ui-selected').addClass('ui-unselecting');
            $('.courseList').data('ui-selectable')._mouseStop(null);
            $('.architectList').data('ui-selectable')._mouseStop(null);
            courseCount = {};
            archCount = {};
            refresh_map();
            clearLegend();
        }
    });
    // bind selectable functionality for architects header
    $('.archsHeadingDiv').selectable({
        selected : function(event, ui) {
            courseCount = {};
            archCount = {};
            refresh_map();
            clearLegend();
        }
    });

    $('.courseList').selectable({
        selected : function(event, ui) {
            // course object that is being selected
            // possible later error...make sure to not modify object
            var course = course_map[$(ui.selected.__data__)[0].className];
            // check to see if the previous selection was an architect
            updateChart(course);
            if (d3.selectAll('.prevArch')._groups[0].length != 0) {

                selectCourses = [];
                courseCount = {};
            }
            // ensure that we're only selecting on the LI selection
            if (ui.selected.tagName === "LI" && courseCount[course.className] !== -1) {
                refresh_chart(course);
                // TODO: figure out how to do map center on functionaloty
                // map.centerOn([course.x,course.y],"latlong",2000);

                // how many times a course has been selected
                if (courseCount.hasOwnProperty(course.className)) {
                    courseCount[course.className]++;
                } else {
                    courseCount[course.className] = 1;
                }
                // update mapping of architect -> number of courses
                course.architects.forEach(function(arch) {
                    if (archCount.hasOwnProperty(arch)) {
                        archCount[arch]++;
                    } else {
                        archCount[arch] = 1;
                    }
                });

                d3.selectAll('.prevArch  > .ui-selected').classed('ui-selected', false).classed('prevArch', false);
                d3.selectAll('.prevArch').classed('ui-selected', false).classed('prevArch', false);
                selectCourses.push($(ui.selected.__data__)[0]);
                refresh_points(selectCourses);
                $(ui.selected).addClass('prevCourse');
            }
        },
        unselected : function(event, ui) {
            var course = $(ui.unselected.__data__)[0];
            courseCount[course.className]--;
            // name sure to only trigger on LI selections
            if (ui.unselected.tagName === "LI") {
                // return all courses that weren't unselected
                selectCourses = selectCourses.filter(function(c) {
                    return c.className !== course.className;
                });
                courseCount[course.className]--;
                course.architects.forEach(function(arch) {
                    archCount[arch]--;
                    if (archCount[arch] === 0) {
                        // if architect now has no courses, unselect
                        d3.selectAll('.architect-' + arch).classed('ui-selected', false)
                    }
                });
                refresh_points(selectCourses);
                $(ui.unselected).removeClass("prevCourse");

            }
        }
    });

    // architectList selectable functionality
    $('.architectList').selectable({
        selected: function(event, ui) {
            var archName = $(ui.selected.__data__)[0].className;
            // check to see if previous selection was a course
            if (d3.selectAll('.prevCourse')._groups[0].length !== 0) {
                selectCourses = [];
                courseCount = {};
                archCount = {};
            }
            selectCourses = [];
            // update map of occurrences of each architect
            if (ui.selected.tagName == "LI" && archCount[archName] !== 1) {
                if (archCount.hasOwnProperty(archName)) {
                    archCount[archName]++;
                } else {
                    archCount[archName] = 1
                }

                var courses = architect_map[$(ui.selected.__data__)[0].className].courses;
                courses.forEach(function(course) {
                    if (selectCourses.indexOf(course) === -1 && is_course_in_current_rankings(course)) {
                        if (courseCount.hasOwnProperty(course.className)) {
                            courseCount[course.className]++;
                        } else {
                            courseCount[course.className] = 1;
                        }
                        selectCourses.push(course);
                        d3.selectAll(".course-" + course.className).classed("ui-selectee", true).classed('ui-selected',true).classed('prevArch', true);
                    }
                });
                selectCourses = selectCourses.map(function(d) {
                    return course_map[d];
                });
                refresh_points(selectCourses);
            }
        },
        unselected: function(event, ui) {
            if (ui.unselected.tagName == "LI") {
                var unselectedCourses = $(ui.unselected.__data__)[0].courses;
                var previouslySelectedArchs = d3.selectAll(".architect").filter('.ui-selected')[0];
                for (var course in unselectedCourses) {
                    if (courseCount.hasOwnProperty(unselectedCourses[course].className)) {
                        courseCount[unselectedCourses[course].className] = courseCount[unselectedCourses[course].className] - 1;
                    }
                }
                for (var key in courseCount) {
                    if (courseCount.hasOwnProperty(key) && courseCount[key] === 0) {
                        selectCourses = selectCourses.filter(function(c) {
                            return c.className !== key;
                        });
                        d3.selectAll(".course-" + key).classed('ui-selected',false);
                    }
                }
                archCount[$(ui.unselected.__data__)[0].className]--;
                refresh_points(selectCourses);
                $(ui.unselected).removeClass("prevArch");
            }
        }
    })
}

// function to check if course is in current rankings being shown
// returns boolean value
function is_course_in_current_rankings(course) {
    var valid_courses = get_valid_courses();
    for (var i in valid_courses) {
        if (valid_courses[i].className === course) {return true}
    }
    return false;

}

// TODO not done
function refresh_chart(course) {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0)
    $('.legend-rankings-ul').empty();

    // if more than one course is selected, dont show chart
    if (d3.selectAll(".courseList > li.ui-selected")._groups[0].length > 1) {
        clearChart();
        clearLegend();
        return
    }

    d3.selectAll(".chart > g svg").remove();
    var chartData = course.chart_data;

    var containerData = [];
    for (var key in chartData) {
        chartData[key].ranks.sort(function(a,b) {
            if (a.year < b.year) return -1;
            if (a.year > b.year) return 1;
        });
        chartData[key]['type'] = chartData[key]['className'].split('_')[1];
        containerData.push(chartData[key]);
    }

    var svg = d3.select('.chart > g')
        .append('svg');

    var pathContainers = svg.selectAll('.line')
        .data(containerData);

    // ENTER
    svg.enter()
        .append('g')
        .attr('class', 'line')
        .attr("style", function(d) {
            return "stroke: " +
                lineColors[d.className]
        });

    console.log(pathContainers);
    // ENTER
    svg.selectAll('path')
        .data(containerData)
        .enter().append('g')
        .attr("style", function(d) {
            return "stroke: " +
                lineColors[d.className]
        })
        .attr('class', 'line')
        .append('path')
        .attr('d',function(d) {
            console.log(d);
            return lineGen(d.ranks)})
        .on('mouseover', function(d) {
            d3.event.stopPropagation();
        });

    // ENTER
    //svg.selectAll('circle')
    //    .data(function(d) {return d.ranks;})
    //    .enter().append('circle')
    //    .attr('cx', function(d) {return xScale(+d.year); })
    //    .attr('cy', function(d) {return yScale(d.rank); })
    //    .style('fill', function(d) {return  lineColors[d.className]})
    //    .attr('r', 3);
    // TODO: Figure out sonething wrong with data. Log should work on line 545. should log list with 1 object
    updateCourseLegend(containerData, course);
}

// function to add headings and lists to courses and architects lists
function initialize_container_lists() {
    // add headers to courses and architects divs
    var coursesHeadingDiv = $('#courses')
        .append($("<div></div>")
            .addClass("coursesHeadingDiv")
            .addClass("heading")
            .append($("<h2></h2>")
                .addClass("coursesHeading")
                .text("Courses")));
    var archsHeadingDiv = $('#architects')
        .append($("<div></div>")
            .addClass("archsHeadingDiv")
            .addClass("heading")
            .append($("<h2></h2>")
                .addClass("archsHeading")
                .text("Architects")));

    var courseUl = $('#courses').append($("<ul></ul>").addClass("courseList"));
    var architectUl = $('#architects').append($('<ul></ul>').addClass("architectList"));


}

// function to initially draw chart and container
function initialize_chart() {
    // chart size variables
    var margin = {top: 10, right: 20, bottom: 15, left: 20},
        width = 300 - margin.left - margin.right,
        chartHeight =  $(window).height() * 0.65 - margin.top - margin.bottom;

    xScale = d3.scaleLinear().range([margin.left, width - margin.right]).domain([2000, 2016]);
    yScale = d3.scaleLinear().range([chartHeight - margin.top, margin.bottom]).domain([103, 1]);
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([1, chartHeight]);

    x.domain([2000, 2016]);
    y.domain([1, 103]);

    var valueline = d3.line()
        .x(function(d) {return x(parseInt(d.year)); })
        .y(function(d) {return y(d.rank); });

    // add svg canvas
    var chartSVG = d3.select('#chart')
        .append("svg")
        .attr("class", 'chart')
        .attr('id', 'chartSVG')
        .attr('width', width + margin.left + margin.right)
        .attr('height', chartHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + 0 + ")");

    // add axis
    chartSVG.append("svg:g")
        .attr("transform", "translate(0," + (chartHeight - margin.bottom + 5) + ")")
        .call(d3.axisBottom(x));
    chartSVG.append("svg:g")
        .attr('transform', "translate(" + (margin.left) + ",0)")
        .call(d3.axisLeft(y));


    $('.legend').remove();
    // add text
    d3.select("#chartSVG").append("text")
        .attr("x", 155)
        .attr("y", (margin.top + 20) / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Course Rankings");



    var infoContainer = d3.select(".container-left")
        .append('div')
        .attr('class', 'courseInformationContainer');

    var courseInfo = infoContainer
        .append("div")
        .attr('class', 'courseInfoDiv');

    var courseRecentRankings = infoContainer
        .append('div')
        .attr('class', 'courseRecentRankingsDiv');


    courseInfo.append('h3')
        .text("")
        .attr('class', 'courseInfoHeader');

    courseInfo.append('h3')
        .text("")
        .attr("class", "courseArchitectInfo infoH");
    courseInfo.append('h3')
        .text("")
        .attr("class", "courseYearInfo infoH");
    courseInfo.append('h3')
        .text("")
        .attr("class", "courseTypeInfo infoH");
    courseInfo.append("h3")
        .text("")
        .attr("class","courseYardageInfo infoH");
    courseInfo.append("h3")
        .text("")
        .attr("class","courseSlopeInfo infoH");
    courseInfo.append("h3")
        .text("")
        .attr("class","courseRatingInfo infoH");


    courseRecentRankings.append("h3")
        .text("Recent Rankings")
        .attr('class', 'recentRankingsHeader');




    var recentRankingsUl = courseRecentRankings.append("ul")
        .attr("class","recentRankings-ul");
    var recentRankingsUlHeader = recentRankingsUl.append('li')
        .attr('class', 'recentRankingsUlHeader');
    recentRankingsUlHeader.append('span')
        .text('publication')
        .attr('class', 'recentRankingsUlHeadSpan pubSpan');
    recentRankingsUlHeader.append('span')
        .text('year')
        .attr('class', 'recentRankingsUlHeadSpan yearSpan');
    recentRankingsUlHeader.append('span')
        .text('rank')
        .attr('class', 'recentRankingsUlHeadSpan rankSpan')

}

function add_check_boxes() {
    var years = [];
    var types = ['public', 'private'];
    var publications = ['Golf Digest', 'Golf Mag.'];
    // create array of all unique years in datasets
    for (var d in all_rankings) {
        var dataset = all_rankings[d];
        var year = +(dataset.split("_")[1]);
        if (years.indexOf(year) === -1) {
            years.push(year);
        }
    }
    // add check boxes for publications, types, years
    for (var p in publications) {
        var publication = publications[p];
        $('<input />', {type: 'checkbox', id: 'cb_pub_' + publication, class : 'cb_pub', value:publication, checked:true})
            .appendTo($('#pubSelectDiv'));
        $('<label />', {'for': 'cb_pub_' + publication, class: 'checkText', text: publication})
            .appendTo($('#pubSelectDiv'));
    }
    for (var t in types) {
        var type = types[t];
        $('<input />', {type: 'checkbox', id: 'cb_type_' + type, class : 'cb_type', value:type, checked:true})
            .appendTo($('#typeSelectDiv'));
        $('<label />', {'for': 'cb_type_' + type, class: 'checkText', text: type})
            .appendTo($('#typeSelectDiv'));
    }

    // bind event listeners to headers for each selection
    $('#pubSelectHeader').click(function() {
        if ($('.cb_pub:checked').length !== publications.length) {
            $('.cb_pub:not(:checked)').each(function() {
                $(this).prop('checked',true);
            })
        } else {
            $('.cb_pub:checked').each(function() {
                $(this).prop('checked',false);
            })
        }
        refresh_map();
    });

    $('#typeSelectHeader').click(function() {
        if ($('.cb_type:checked').length !== types.length) {
            $('.cb_type:not(:checked)').each(function() {
                $(this).prop('checked',true);
            })
        } else {
            $('.cb_type:checked').each(function() {
                $(this).prop('checked',false);
            })
        }
        refresh_map();
    });

    // bind event listeners to checkboxes

    $('.cb_type').change( function(){
        refresh_map();
    });

    $('.cb_pub').change( function(){
        refresh_map();
    });
}


// function to create slider widget for publication year select
function initialize_publication_year_widget() {
    // add year header


    var slider = $('#pubYearSelectWidgetDiv').limitslider({
        values:     [2001, 2016],
        min:2001,
        max:2016,
        left: 2001,
        right: 2016,
        gap : 0,
        slide: function(event, ui) {
            var text;
            if (ui.values[0] === ui.values[1]) {
                text = ui.values[0];
            } else {
                text = ui.values[0] + " to " + ui.values[1];
            }
            $('#yearSelectHeader').text(text);
            // TODO: add functionality to update point and lists based on criteria
            refresh_map();
        }
    });
    $('#yearSelectHeader').text("2001 to 2016");
    // add classes to the left and right slider nodes (needed to bind click behaviour)
    $($('.ui-slider-handle')[0]).addClass('left-slide-node');
    $($('.ui-slider-handle')[1]).addClass('right-slide-node');


    // on double click, manually set both to the clicked year
    // TODO: add functionality to update map, courses and architects
    // TODO: if two widgets overlap at the furtherst most right point, impossible to select something else

    $('.left-slide-node').dblclick(function(d,ui) {
        var val = $('#pubYearSelectWidgetDiv').limitslider("values")[0];
        $('#pubYearSelectWidgetDiv').limitslider("values", [val, val]);
        $('#yearSelectHeader').text(val);
        refresh_map();
    });
    $('.right-slide-node').dblclick(function(d,ui) {
        var val = $('#pubYearSelectWidgetDiv').limitslider("values")[1];
        $('#pubYearSelectWidgetDiv').limitslider("values", [val, val]);
        $('#yearSelectHeader').text(val);
        refresh_map();
    });
}

// function to create course_year slider
function initialize_course_year_slider() {
    $("#slider").slider({
        range:"max",
        min:1890,
        max:2016,
        value:2016,
        slide: function(event, ui) {
            refresh_map();
            $("#year").val($("#slider").slider("option","value"));
        }
    });

    $("#year").val(2016);

}
// updates map, courses and architects list
function refresh_map() {
    var valid_courses = get_valid_courses();
    refresh_points(valid_courses);
    update_course_list(valid_courses);
    update_architect_list(valid_courses);

}


// generates list of valid courses based on publication type, pub_year and course year
function get_valid_courses() {


    var valid_publications = [];
    var valid_types = [];
    var valid_year = +$("#slider").slider("option","value");
    // bounds that a publication date must fall in
    var pub_year_bounds = $('#pubYearSelectWidgetDiv').limitslider("values");
    // find valid publications
    $(".cb_pub:checked").each(function() {
        valid_publications.push($(this).val());
    });

    // find valid types
    $('.cb_type:checked').each(function() {
        valid_types.push($(this).val());
    });


    // first, generate list of valid rankings to pull courses from
    var rankings = Object.keys(ranking_map);
    var filtered_rankings = rankings.filter(function(c) {
        var split_ranking = c.split("_");
        var pub_name = pub_display_class_map[split_ranking[0]];
        var pub_year = +split_ranking[1];
        var valid_pub_year = pub_year >= pub_year_bounds[0] && pub_year <= pub_year_bounds[1];
        var valid_pub = valid_publications.indexOf(pub_name) !== -1;
        return valid_pub_year && valid_pub;
    });
    // return an empty array if there are no valid rankings
    if (filtered_rankings.length === 0) {
        return [];
    }
    // find list of valid courses from valid rankings
    // first: map ranking -> courses
    // second: reduce from [[courses], [courses], [courses]] -> [courses]
    // third: map pine valley -> pine_valley
    // fourth(uniq function): remove duplicates by converting to set then back to array
    // fifth: map cNape -> course(object)

    return uniq(filtered_rankings.map(function(r) {
        return Object.keys(ranking_map[r]['courses'])
    }).reduce(function(a,b) {return a.concat(b)})
        .map(function(c) {
            return createClassName(c);
        })).map(function(c) {
        return course_map[c];
    }).filter(function(c) {
        return +c.yearCreated[0] < valid_year  &&
            valid_types.indexOf(c.type) !== -1;
    });

}


// removes old points if they exist and adds new points
// courses: list of courses to be mapped
function refresh_points(courses) {
    // map courses to add geometry
    var mapped_courses = courses.map(function(c) {return type(c)});

    // empty pointLayer
    $('.pointLayer').empty();
    var points = d3.select('.pointLayer').selectAll('circle')
        .data(mapped_courses)
        .enter()
        .append('circle')
        .attr('cx', function(d) {return projection(d.geometry.coordinates)[0]})
        .attr('cy', function(d) {return projection(d.geometry.coordinates)[1]})
        .attr('r', 5)
        .style("fill", function(c) {
            if (c.type === "private") {
                return "blue"
            } else {
                return "red"
            }
        })
        .attr('class', 'point')
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("background-color", 'lightgray');
            tooltip.html(d.displayName + "<br/> " + d.yearCreated[0]
                    + ", " + architect_map[d.architects[0]].displayName + "<br/>")
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on('click', function(d) {
            refresh_chart(d);
        });
    mapCourses = d3.selectAll('.point');
}

// generate initial map as well as bind zoom functionality
function generate_map() {
    var h = $(window).height();
    var w = $(window).width();

    projection = d3.geoMercator()
        .scale(1 / tau)
        .translate([0, 0]);
    tile = d3.tile()
        .size([w, h]);
    zoom = d3.zoom()
        .scaleExtent([1 << 11, 1 << 19])
        .on("zoom", zoomed)
        .filter(function(d) {
            // filtering which events to zoom on and which fall through to other functionality
            if (d3.event.type === "wheel") {
                return true
            } else if (d3.event.shiftKey) {
                return false;
            } else {
                return true;
            }
        });

    svg = d3.select('#map')
        .style("width", w)
        .style("height", h);

    d3.select('#mapContainer')
        .style("width", w + 'px')
        .style("height", h + 'px');
    raster = svg.append("g");
    annotG = d3.select('#map').append('g');
    var center = projection([-98.5, 39.5]);

    svg.call(zoom)
        .call(zoom.transform, d3.zoomIdentity
            .translate(w / 2, h / 2)
            .scale(1 << 12)
            .translate(-center[0], -center[1]));
    // add svg container to hold all points
    d3.select('#map').append("svg")
        .style("width", w)
        .style("height", h)
        .attr('class', 'pointLayer');


    d3.select('#mapContainer')
        .on('mousedown', function(d) {
            if (d3.event.shiftKey) {
                zoomStart();
            }

        })
        .on('mousemove', function(d) {
            if (d3.event.shiftKey) {
                zoomMove();
            } else {
                endRubberBand();
            }
        })
        .on('mouseup', function(d) {
            if (d3.event.shiftKey) {
                zoomUp();
            }
        });
}

/////////////////////////////////////////////
//////   Rubberbanding for shift-click //////
/////////////////////////////////////////////

function zoomStart() {
    rubberBand = {'start' : {'x': d3.event.x, 'y': d3.event.y}};
    d3.event.stopPropagation();
}

function zoomMove() {
    if (rubberBand) {
        rubberBand.end = {'x' : d3.event.x, 'y' : d3.event.y};

        var rb = annotG.selectAll('.rubberband')
            .data([rubberBand]);

        // add rubberband class to those now in the rubberband
        rb.enter().append('rect')
            .attr('class', 'rubberband');

        rb.attr('x', function(d){ return Math.min(d.start.x, d.end.x)})
            .attr('y', function(d){ return Math.min(d.start.y, d.end.y)})
            .attr('width', function(d){return Math.abs(d.start.x-d.end.x);})
            .attr('height', function(d){return Math.abs(d.start.y-d.end.y);})
            .attr('fill', 'none')
            .attr('stroke', '#333')
            .attr('stroke-width', '0.75px');

        rb.exit().remove();
    }
    d3.event.stopPropagation();
}

// updates lists and map based on rubberbanding
function endRubberBand() {
    var rb = annotG.selectAll('.rubberband').remove();

    var selectedCourses = [];
    if (rubberBand) {
        mapCourses.each(function(c) {
            var w = Math.min(rubberBand.start.x, rubberBand.end.x),
                e = Math.max(rubberBand.start.x, rubberBand.end.x),
                n = Math.min(rubberBand.start.y, rubberBand.end.y),
                s = Math.max(rubberBand.start.y, rubberBand.end.y);

            var cr = this.getBoundingClientRect();
            if (cr.right >= w && cr.left <= e && cr.top <= s && cr.bottom >= n) {
                selectedCourses.push(this.__data__);
            }
        });
        refresh_points(selectedCourses);
        update_course_list(selectedCourses);
        update_architect_list(selectedCourses);
        rubberBand = null;


    }

}

// clear chart of all text and plots
function clearChart() {
    d3.selectAll(".chart > g svg").remove();
    $(".legend-name").text("");
    $(".legend-architects").text("");
    $(".legend-year").text("");
    $(".legend-type").text("");
}

// function to clear legend of all contents
function clearLegend() {
    d3.select(".courseInfoHeader")
        .text("");
    d3.selectAll(".courseArchitectInfo")
        .text("");
    d3.selectAll(".courseYearInfo")
        .text("");
    d3.selectAll(".courseTypeInfo")
        .text("");
    d3.selectAll(".courseYardageInfo")
        .text("");
    d3.selectAll(".courseSlopeInfo")
        .text("");
    d3.selectAll(".courseRatingInfo")
        .text("");
    d3.select(".recentRankingsHeader")
        .text("");
    $(".legendRanking").remove();

}


// function to zoom map. Queries new tiles
// TODO: add functionality to update points if they exist
function zoomed() {
    var transform = d3.event.transform;
    var tiles = tile
        .scale(transform.k)
        .translate([transform.x, transform.y])
        ();


    projection
        .scale(transform.k / tau)
        .translate([transform.x, transform.y]);
    d3.selectAll(".point")
        .attr("cx", function(d) {return projection(d.geometry.coordinates)[0]})
        .attr("cy", function(d) {return projection(d.geometry.coordinates)[1]})
        .attr("r", Math.log(10 * transform.k *.0008));

    var image = raster
        .attr("transform", stringify(tiles.scale, tiles.translate))
        .selectAll("image")
        .data(tiles, function(d) { return d; });

    image.exit().remove();

    image.enter().append("image")
        .attr("xlink:href", function(d) {
            return "http://" + "abc"[d[1] % 3] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
        .attr("x", function(d) { return d[0] * 256; })
        .attr("y", function(d) { return d[1] * 256; })
        .attr("width", 256)
        .attr("height", 256);
}


function zoomUp() {
    endRubberBand();
}

// function to update course list
function update_course_list(courses) {



    // select the courses list
    var courseSelect = d3.select("#courses ul").selectAll('.course')
        .data(courses, function(d,i){return d.className+'-'+i;});



    // defines all elements entering the DOM
    var courseEnter = courseSelect.enter().append('li')
        .attr('class',function(d){return 'course course-'+d.className;});

    // adds left span
    // TODO: figure out what to do with course ranking
    courseEnter.append('span')
        .text ("")
        .style('float', 'left')
        .style("border", "none");

    // adds course name
    courseEnter.append('span')
        .text ( function(a) {
            return a.displayName;
        });
    courseSelect.exit()
        .transition()
        .duration(250)
        .delay(function(d,i) {
            return i * 2;
        })
        .ease(d3.easeLinear)
        .style('opacity', 0)
        .on('end',function(d){
            d3.select(this).remove();
        });
}

// function to update architects list
function update_architect_list(courses) {
    $(".architectList").empty();
    var filteredArchitects = [];
    var filteredArchitectsMap = {};
    courses.forEach(function(c) {
        c.architects.forEach(function(a) {
            var architect = architect_map[a];
            if (!filteredArchitectsMap.hasOwnProperty(architect.className)) {
                filteredArchitectsMap[architect.className] = architect;
                filteredArchitectsMap[architect.className].count = 1;
                filteredArchitectsMap[architect.className].courses = architect.courses;
            } else {
                filteredArchitectsMap[architect.className].count++;
            }
        });
    });
    for (var key in filteredArchitectsMap) {
        if (filteredArchitectsMap.hasOwnProperty(key)) {
            filteredArchitects.push(filteredArchitectsMap[key]);
        }
    }
    filteredArchitects = filteredArchitects.sort(function(a,b) {
        return -(a.count - b.count);
    });

    var architectSelect = d3.select("#architects ul").selectAll('.architect')
        .data(filteredArchitects, function(data, index){return data.className + "-" + index});

    var architectEnter = architectSelect.enter().append('li')
        .attr('class', function(d){return 'architect architect-'+d.className;});
    architectEnter.append('span')
        .text( function(a) {
            return a.displayName;
        });
    architectEnter.merge(architectSelect).append('span')
        .text( function(a) {
            return a.count;
        })
        .style('float', 'right');
    architectSelect.exit().remove();
}

// function to resize right panel on load or resizing viz
function rightControlResize() {
    var windowHeight = $(window).height();
    $("#rankingsControl").height(200);

    var remainingSpace = windowHeight - 200;


    $("#courses").height(remainingSpace * 0.7);
    $("#architects").height(remainingSpace * 0.28);
}



// function to update chart
function updateChart(course) {
    //// mapping of ranking to line color
    //var lineColors = {
    //    'GDigest_All' : "#0000E6",
    //    'GDigest_Public' : "#E60000" ,
    //    'Golf_All' : "#80B3ff",
    //    'Golf_Public' : "#FF8080"
    //
    //};
    //tooltip.transition()
    //    .duration(500)
    //    .style("opacity", 0);
    //$(".legend-rankings-ul").empty();
    //
    //
    //// if more than one course is selected, dont show chart
    //if (d3.selectAll(".courseList > li.ui-selected")._groups[0].length > 1) {
    //    clearChart();
    //    clearLegend();
    //    return
    //}
    //
    //d3.selectAll(".chart > g svg").remove();
    //var chartData = course_map[course['className']]['chart_data'];
    //var containerData = [];
    //for (var key in chartData) {
    //    chartData[key].ranks.sort(function(a,b) {
    //        if (a.year < b.year) return -1;
    //        if (a.year > b.year) return 1;
    //    });
    //
    //    chartData[key]['type'] = chartData[key]['className'].split("_")[1];
    //
    //    containerData.push(chartData[key]);
    //}
    //
    //var svg = d3.select(".chart > g")
    //    .append('svg');
    //var pathContainers = svg.selectAll('g.line')
    //    .data(containerData);
    //
    //pathContainers.enter()
    //    .append('g')
    //    .attr('class', 'line')
    //    .attr("style", function(d) {
    //        return "stroke: " +
    //            lineColors[d.className]
    //    });
    //
    //pathContainers.selectAll('path')
    //    .data(function(d) {return [d];})
    //    .enter().append('path')
    //    .attr('d',function(d) {
    //        return lineGen(d.ranks) })
    //    .on('mouseover', function(d) {
    //        d3.event.stopPropagation();
    //
    //    });
    //
    //
    //pathContainers.selectAll('circle')
    //    .data(function(d) {return d.ranks;})
    //    .enter().append('circle')
    //    .attr('cx', function(d) {return xScale(d.year); })
    //    .attr('cy', function(d) {return yScale(d.rank); })
    //    .style('fill', function(d) {return  lineColors[d.className]})
    //    .attr('r', 5);
    //updateCourseLegend(containerData, course);
    //

}

function updateCourseLegend(containerData, course) {

    $(".recentRankings-ul > li").not("li:first").remove();
    d3.selectAll(".legend")
        .data(containerData);
    d3.select(".courseInfoHeader")
        .text(course.displayName);
    d3.selectAll(".courseArchitectInfo")
        .text("architect: " + architectsToString(course.architects));
    d3.selectAll(".courseYearInfo")
        .text("built: " + course.yearCreated[0]);
    d3.selectAll(".courseTypeInfo")
        .text("type: " + course.type);
    d3.selectAll(".courseYardageInfo")
        .text("yardage: " + course.yardage);
    d3.selectAll(".courseSlopeinfo")
        .text("slope: " + course.slope);
    d3.selectAll(".courseRatingInfo")
        .text("rating: " + course.rating);
    var legendRankingsSelect = d3.select(".recentRankings-ul").selectAll(".ranking")
        .data(containerData);
    var legendRankingsEnter = legendRankingsSelect.enter().append("li")
        .attr('class', function(d) {
            return "legendRanking ranking-" + d.className;
        });
    legendRankingsEnter.append('span')
        .text(function(a) {
            return a.displayName;
        })
        .style("color", function(a) {return lineColors[a.className]})
        .attr('class', 'pubSpan');
    legendRankingsEnter.append('span')
        .text(function(a) {
            return a.ranks[a.ranks.length - 1].year;
        })
        .style("margin-left","5px")
        .attr("class", 'yearSpan');
    legendRankingsEnter.append('span')
        .text(function(a) {
            return a.ranks[a.ranks.length - 1].rank;
        })
        .style("margin-left","5px")
        .attr('class', 'rankSpan');
    d3.select(".legend-right-ul-header")
        .text("Recent Rankings");
}



///////////////////////////////////////////
///////////// Helper Functions ////////////
///////////////////////////////////////////

// function to return the string version of a translation to be performed
// scale: scale to be used in translation
// translate: amount to translate
// return: string version of translation
function stringify(scale, translate) {
    var k = scale / 256, r = scale % 1 ? Number : Math.round;
    return "translate(" + r(translate[0] * scale) + "," + r(translate[1] * scale) + ") scale(" + k + ")";
}
// function to create a valid class name from a string
// strips and replaces characters that are not valid selectors
// cls: string to be transformed to a classname
// return: classname for cls
function createClassName(cls) {
    return cls.trim().replace(/\(|\)|\{|\}|\&|\.|\"|\'/g,'').replace(/\s|\-/g,'_').toLowerCase();
}
// function to map points to a geometry
function type(d) {
    d['geometry'] = {type: "Point", coordinates: [+d.x, +d.y]}
    return d
}

// converts a to set and then back to array (removes duplicates)
function uniq(a) {
    return Array.from(new Set(a));
}

function architectsToString(myArr) {
    var returnStr = "";
    for (var i in myArr) {
        if (i != 0) {
            returnStr += ", ";
        }
        returnStr += architect_map[myArr[i]].displayName;
    }
    return returnStr;
}

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
//var all_rankings = [
//    'GDigest_2017_Public'
//];
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
    "GDigest_2015_Public",
    'GDigest_2017_All',
    'GDigest_2017_Public'
];

var most_recent_ranking = 'GDigest_2017_All';

// mapping from publication display_name -> class_name
var pub_display_class_map = {
    "GDigest" : "Golf Digest",
    "Golf" : 'Golf Mag.'

};

var course_type_colors = {
    'public' : '#008837',
    'private' : '#a6611a'
}
var lineColors = {

    'GDigest_All' : "#0000E6",
    'GDigest_Public' : "#80B3ff" ,
    'Golf_All' : "#E60000",
    'Golf_Public' : "#FF8080"

};

var zoom_scale;

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

var rankTooltip;

var chartTooltip;

var lineGen = d3.line()
    .x(function(d) {
        return xScale(parseInt(d.year));
    })
    .y(function(d) {
        return yScale(d.rank);
    });

var yScale, xScale;


var wt = d3.transition()
    .duration(500);

// ensure that when the map is resized the map resizes
$(window).on("resize", function() {
    var resize_height = $(window).height();
    var resize_width = $(window).width();
    $("#main").height(resize_height)
        .width(resize_width);
    rightControlResize();
    leftControlResize();
    d3.select('#map')
        .style("width", resize_width)
        .style("height", resize_height);
    d3.select('#mapContainer')
        .style("width", resize_width + 'px')
        .style("height", resize_height + 'px');
    $('#chart').height(resize_height * .5);

    var help_x_pos = $(window).width() - 375
    $('#tlyPageGuideToggles').css("left", help_x_pos);





});
$(window).on("load", function() {
    var h = $(window).height();
    var w = $(window).width();
    $("#main").height(h)
        .width(w);
    load_all_rankings(all_rankings);

    generate_map();
});
$(document).ready(function() {
    tl.pg.init({});
    var help_x_pos = $(window).width() - 375
    $('#tlyPageGuideToggles').css("left", help_x_pos);
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
            console.log("iterating through: " + d);
            console.log('loading: ' + ranking_path);
            // array of all courses in this ranking
            var ranking_courses = [];

            // object for publication metadata
            var publication = {
                className: createClassName(json.Publication),
                displayName: json.Publication
            };
            // metadata of specific ranking
            var ranking = {
                className: ranking_name,
                publication: publication,
                year: json.Year,
                type: json.Type,
                courses: {}
            };

            // iterate through all courses in a ranking
            json.Courses.forEach(function (c) {
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
                        archs.forEach(function (a) {
                            var arch_class_name = createClassName(a);
                            // if architect does not exist, add to map
                            if (!architect_map.hasOwnProperty(arch_class_name)) {
                                architect_map[arch_class_name] = {
                                    displayName: a,
                                    className: arch_class_name,
                                    count: 1,
                                    courses: [course_class_name]
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
                                displayName: c.Architect,
                                className: arch_class_name,
                                count: 1,
                                courses: [course_class_name]
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
                        displayName: c.CourseName,
                        className: course_class_name,
                        yearCreated: course_years,
                        rankings: publication_ranking,
                        coordinates: c.Coordinates,
                        x: c.Coordinates[1],
                        y: c.Coordinates[0],
                        architects: archs.map(function (d) {
                            return createClassName(d)
                        }),
                        type: c.Type
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
            console.log(ranking_name);
            // check to see if we have visited every ranking
            if (all_rankings.indexOf(ranking_name) === all_rankings.length - 1) {
                ///////////////////////////////////////////////
                /////// integrate slope and rating data ///////
                ///////////////////////////////////////////////
                d3.csv('Data/supplemental/slopeRatingYardageData.csv', function (slopeData) {
                    slopeData.forEach(function (c) {
                        // TODO: figure out why some courses are not in map yet(?)
                        var course_class_name = createClassName(c.name);
                        if (Object.keys(course_map).indexOf(course_class_name) !== -1) {
                            course_map[course_class_name]['slope'] = +c.slope;
                            course_map[course_class_name]['par'] = +c.par;
                            course_map[course_class_name]['rating'] = +c.rating;
                            course_map[course_class_name]['yardage'] = +c.yardage;
                        }
                    });
                    d3.csv('Data/supplemental/course_location_info.csv', function (locationData) {
                        locationData.forEach(function (c) {
                            var course_class_name = createClassName(c.CourseName);
                            if (Object.keys(course_map).indexOf(course_class_name) !== -1) {
                                course_map[course_class_name]['city'] = c.City;
                                course_map[course_class_name]['state'] = c.State;
                            }
                        })
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
                                    displayName: split_ranking[0] + " " + split_ranking[2],
                                    className: split_ranking[0] + "_" + split_ranking[2],
                                    ranks: [{
                                        year: +split_ranking[1],
                                        rank: course_map[c].rankings[ranking],
                                        displayName: split_ranking[0] + " " + split_ranking[2],
                                        className: split_ranking[0] + "_" + split_ranking[2]
                                    }]
                                };
                                // if the course already has a ranking for pub_type combo
                            } else {
                                course_rankings[chart_ranking].ranks.push({
                                    year: +split_ranking[1],
                                    rank: course_map[c].rankings[ranking],
                                    className: split_ranking[0] + "_" + split_ranking[2],
                                    displayName: split_ranking[0] + " " + split_ranking[2]

                                });
                            }
                        }
                        course_map[createClassName(c)]['chart_data'] = course_rankings
                    }
                    //////////////////////////////////////////////////////////////////
                    ////////// Code here for events after data is loaded /////////////
                    //////////////////////////////////////////////////////////////////

                    tooltip = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

                    rankTooltip = d3.select('body').append('div')
                        .attr('class', 'rankTooltip')
                        .style('opacity', 0);

                    chartTooltip = d3.select('body').append('div')
                        .attr('class', 'chartTooltip')
                        .style('opacity', 0)

                    initialize_chart();
                    initialize_container_lists();
                    populate_ranking_matrix();
                    add_check_boxes();
                    initialize_publication_year_widget();
                    initialize_course_year_slider();
                    initialize_selectable()
                    refresh_map();
                    rightControlResize();
                })
            }
        })
    });

}

function populate_ranking_matrix() {
    var year_scale = d3.scaleLinear().domain([2001, 2017]).range([0, 135]);
    var rankings = Object.keys(ranking_map);
    // kind of hacky...
    // empty object inserts to offset the pattern svg inserted for hatching
    var golf_mag_rankings = [{},{}, {}, {}, {}, {}, {},{},{},{},{}];
    var golf_digest_rankings = [{},{}, {}, {}, {}, {}, {},{},{},{},{}];



    for (var r in rankings) {
        var ranking = rankings[r].split('_');
        var rank_obj = {'publication' : ranking[0],
            'year' : +ranking[1],
            'type' : ranking[2]}
        if (rank_obj['publication'] === 'Golf') {
            golf_mag_rankings.push(rank_obj)
        } else {
            golf_digest_rankings.push(rank_obj)
        }
    }
    // add shading behind rankings
    // every 2 years?
    var start_years = [2001,2003,2005,2007, 2009, 2011, 2013, 2015, 2017]
    d3.select('#GDigestCoursesContainer > svg')
        .append('svg')
        .selectAll('rect')
        .data(start_years)
        .enter()
        .append('rect')
        .attr('height', 96)
        .attr('width', 2)
        .attr('x', function(d) {
            return year_scale(d) + 3
        })
        .attr('fill', 'gray')
        .style('opacity',.2);
    d3.select('#GolfCoursesContainer > svg')
        .append('svg')
        .selectAll('rect')
        .data(start_years)
        .enter()
        .append('rect')
        .attr('height', 96)
        .attr('width', 2)
        .attr('x', function(d) {
            return year_scale(d) + 3
        })
        .attr('fill', 'gray')
        .style('opacity',.2);

    var year_axis =d3.axisTop(year_scale)
        .tickValues([2001,2003,2005,2007,2009,2011,2013,2015,2017])
        .tickFormat(function(d) {
            return "'" + String(d).slice(2,4);
        });
    var svg = d3.select('#rankingYearsSVG')
        .attr('height', 35)
        .attr('width', 190);

    svg.append('g')
        .attr('transform', 'translate(45,30)')
        .attr('class', 'rankingYearAxisGroup')
        .call(year_axis)
        .selectAll('text')
        .style("text-anchor", "end")
        .attr("dx", ".5em")
    //.attr("dy", ".5em");

    d3.select('#GolfCoursesContainer > svg')
        .selectAll('rect')
        .data(golf_mag_rankings)
        .enter()
        .append('rect')
        .attr('class',function(d) {return 'Golf ' + d['type'] + ' ' + d['year'] +  ' rankingRect selected'})
        .attr('y', function(d) {
            if (d['type'] === 'Public') {
                return 30
            }  else {
                return 7
            }
        })
        .attr('x', function(d) {
            return year_scale(d['year'])
        })
        .attr('width', 8)
        .attr('height', 15)
        .attr('fill', function(d) {
            return d['type'] == 'Public' ?  lineColors['Golf_Public'] : lineColors['Golf_All'];
        });


    d3.select('#GDigestCoursesContainer > svg')
        .selectAll('rect')
        .data(golf_digest_rankings)
        .enter()
        .append('rect')
        .attr('class',function(d) {return 'GDigest ' + d['type'] + ' ' + d['year'] +  ' rankingRect selected'})
        .attr('y', function(d) {
            if (d['type'] === 'Public') {
                return 30
            }  else {
                return 7
            }
        })
        .attr('x', function(d) {
            return year_scale(d['year'])
        })
        .attr('width', 8)
        .attr('height', 15)
        .attr('fill', function(d) {
            return d['type'] == 'Public' ?  lineColors['GDigest_Public'] : lineColors['GDigest_All']
        });
    d3.selectAll('.rankingRect')
        .on('click', function(d) {
            var classList = d3.select(this)._groups[0][0].classList;
            var classSelector = classList[0] + classList[1];
            if (d3.select(this).classed('selected')) {
                d3.select(this).classed('selected', false);
                d3.select(this).classed('unselected', true);
                d3.select(this).attr('fill', 'url(#' + classSelector + '-pattern-stripe)');
                // do stuff to update map
            } else {
                d3.select(this).classed('selected', true);
                d3.select(this).classed('unselected', false);
                d3.select(this).attr('fill', lineColors[classList[0] + '_' + classList[1]]);
            }
            refresh_map();
        })
        .on("mouseover", function(d) {
            rankTooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("background-color", 'lightgray');
            rankTooltip.html(d['year'])
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            rankTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
    ;
    $('.pubTextContainer')
        .click(function(d) {
            var pub_name = d.currentTarget.textContent;
            // if all rects with this pub name are selected, deselect all
            // else, select all
            var selected_ranks;
            var all_ranks;
            var pub_class;
            if (pub_name === 'Golf Digest') {
                selected_ranks = d3.selectAll('.GDigest.rankingRect.selected');
                // all publications for a given ranking
                all_ranks = d3.selectAll('.GDigest.rankingRect');
                pub_class = '.GDigest';
            } else {
                selected_ranks = d3.selectAll('.Golf.rankingRect.selected');
                all_ranks = d3.selectAll('.Golf.rankingRect');
                pub_class = '.Golf'
            }

            if (selected_ranks._groups[0].length === all_ranks._groups[0].length) {
                // all previous selected, deselect all
                d3.selectAll(pub_class + '.rankingRect.selected')
                    .attr('fill', function(d) {
                        return 'url(#' + d['publication'] + d['type'] + '-pattern-stripe)'
                    })
                    .classed('unselected', true).classed('selected', false);

            } else {
                d3.selectAll(pub_class + '.rankingRect.unselected')
                    .attr('fill', function(d) {
                        return lineColors[d['publication'] + '_' + d['type']];
                    })
                    .classed('unselected', false).classed('selected', true);
            }
            refresh_map();
        });

    $('.rankingTextDiv')
        .click(function(d) {
            var clicked_text = d.currentTarget.id;
            var selectedRanks;
            var all_ranks;
            var pub_class;
            var type_class;
            // golfMag
            if ((clicked_text).search('Golf') !== -1) {
                // All
                pub_class = '.Golf';
                if (clicked_text.search('All') !== -1) {
                    selectedRanks = d3.selectAll('.Golf.All.selected');
                    all_ranks = d3.selectAll('.Golf.All');
                    type_class = 'All';
                } else {
                    selectedRanks = d3.selectAll('.Golf.Public.selected');
                    all_ranks = d3.selectAll('.Golf.Public');
                    type_class = 'Public';
                }
                // golfDigest
            } else {
                pub_class = '.GDigest';
                if (clicked_text.search('All') !== -1) {
                    selectedRanks = d3.selectAll('.GDigest.All.selected');
                    all_ranks = d3.selectAll('.GDigest.All');
                    type_class = 'All';
                } else {
                    selectedRanks = d3.selectAll('.GDigest.Public.selected');
                    all_ranks = d3.selectAll('.GDigest.Public');
                    type_class = 'Public';
                }
            }

            if (selectedRanks._groups[0].length === all_ranks._groups[0].length) {
                d3.selectAll(pub_class + '.' + type_class +'.rankingRect.selected')
                    .attr('fill', function(d) {
                        return 'url(#' + d['publication'] + d['type'] + '-pattern-stripe)'
                    })
                    .classed('unselected', true).classed('selected', false);
            } else {
                d3.selectAll(pub_class +  '.'  + type_class + '.rankingRect.unselected')
                    .attr('fill', function(d) {
                        return lineColors[d['publication'] + '_' + d['type']];
                    })
                    .classed('unselected', false).classed('selected', true);
            }
            refresh_map();
        });



    d3.selectAll('.rankingRect').style('z-index', 1);


}
// get all rankings that are currently selected
function get_selected_rankings() {
    var selected_rankings = d3.selectAll('.rankingRect.selected')._groups[0];
    $('#rankingHeader').text('Ranking Select   (' + selected_rankings.length + ' shown)')
    var selected_classes = [];
    // class in format GDigest_2011_Public
    // GDigest or Golf
    for (var i in selected_rankings) {

        if (selected_rankings.hasOwnProperty(i) && i !== 'length') {
            var classes = selected_rankings[i].classList;
            if (classes[0] === 'Golf') {
                selected_classes.push('Golf_' +
                    classes[2] + '_' + classes[1])
            } else {
                selected_classes.push('GDigest_' +
                    classes[2] + '_' + classes[1])
            }

        }
    }
    return selected_classes;
}

function bring_back_all_courses() {
    $('#mapTitle').text('All Courses');
    refresh_map();
}

function reset_map() {
    // reset selection
    $('.ui-selected').removeClass('ui-selected').addClass('ui-unselecting');
    courseCount = {};
    archCount = {};
    selectCourses = [];
    bring_back_all_courses();
    clearLegend();

    // reset map to center with normal zoom
    var h = $(window).height();
    var w = $(window).width();


}

// function to bind all selection handlers to list and headers
function initialize_selectable() {

    // map to keep track of architects for a selected course
    var courseCount = {};
    var archCount = {};

    // bind selectable functionality for courses header
    $('.courseHeadingTitleDiv').selectable({
        selected : function(event, ui) {
            reset_map();
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
            // TODO: should only do if only one course is selected... stil doesnt work
            if ($('.courseList > .ui-selected').length < 2) {
                pan_to_course(course);
            }
            if (d3.selectAll('.prevArch')._groups[0].length != 0) {

                selectCourses = [];
                courseCount = {};
            }
            // ensure that we're only selecting on the LI selection
            if (ui.selected.tagName === "LI" && courseCount[course.className] !== -1) {

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
                refresh_chart(course);
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
                update_course_list(selectCourses);
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

    // selectables for course ordering

    // alphabetical sorting
    $('.alphabeticalSortDiv').click(function(d) {
        var sorted_courses;
        var descending;
        // if list was previously sorted alphabetically
        if ($('.alphabeticalSortDiv').hasClass('active')) {
            var span = $('.alphabeticalSortDiv > span');
            // starting descending, switch to ascending
            if (span.hasClass('glyphicon-arrow-down')) {
                span.removeClass('glyphicon-arrow-down')
                    .addClass('glyphicon-arrow-up');
                descending = false;

            } else {
                // switch to ascending
                span.removeClass('glyphicon-arrow-up')
                    .addClass('glyphicon-arrow-down');
                descending = true;
            }

            // sort

            // list was previously sorted numerically
        } else {
            // switch active div
            $('.alphabeticalSortDiv').addClass('active').removeClass('inactive');
            $('.orderedSortDiv').removeClass('active').addClass('inactive');

            // switched orderedSort to descending arrow
            if ($('.orderedSortDiv > svg ').hasClass('glyphicon-arrow-up')) {
                $('.orderedSortDiv > svg ').removeClass('glyphicon-arrow-up')
                    .addClass('glyphicon-arrow-down');
            }
            descending = true;
        }

        if (descending) {
            sorted_courses = get_valid_courses().sort(function(a,b) { return a.displayName > b.displayName ? 1 : -1});
        } else {
            sorted_courses = get_valid_courses().sort(function(a,b) {return a.displayName <= b.displayName ? 1 : -1});
        }
        var highlighted_courses = get_highlighted_courses().map(function(d) {return d.className});
        // check to make sure that we actually have some map courses to filter on
        // if not we just take courses we already had

        update_course_list(sorted_courses);
        if (highlighted_courses.length == 1) {
            setTimeout(function() {
                scroll_courses_list(course_map[highlighted_courses[0]]);
                d3.select('li.course-' + course_map[highlighted_courses[0]].className).classed('ui-selected', true);
            }, 1000);

        };


    });

    // numeric sorting
    $('.orderedSortDiv').click(function(d) {
        var sorted_courses;
        var descending;
        var valid_rankings = get_selected_rankings();
        // if list was previously sorted ordered
        if ($('.orderedSortDiv').hasClass('active')) {
            var span = $('.orderedSortDiv > span');
            // starting descending, switch to ascending
            if (span.hasClass('glyphicon-arrow-down')) {
                span.removeClass('glyphicon-arrow-down')
                    .addClass('glyphicon-arrow-up');
                descending = false;

            } else {
                // switch to ascending
                span.removeClass('glyphicon-arrow-up')
                    .addClass('glyphicon-arrow-down');
                descending = true;
            }
            // list was previously sorted numerically
        } else {
            // switch active div
            $('.orderedSortDiv').addClass('active').removeClass('inactive');
            $('.alphabeticalSortDiv').removeClass('active').addClass('inactive');

            // switched orderedSort to descending arrow
            if ($('.alphabeticalSortDiv > svg ').hasClass('glyphicon-arrow-up')) {
                $('.alphabeticalSortDiv > svg ').removeClass('glyphicon-arrow-up')
                    .addClass('glyphicon-arrow-down');
            }
            descending = true;
        }
        if (descending) {
            sorted_courses = composite_sort(get_valid_courses());
        } else {
            sorted_courses = composite_sort(get_valid_courses()).reverse();
        }


        var highlighted_courses = get_highlighted_courses().map(function(d) {return d.className});
        // check to make sure that we actually have some map courses to filter on
        // if not we just take courses we already had

        update_course_list(sorted_courses);
        if (highlighted_courses.length == 1) {
            setTimeout(function() {
                scroll_courses_list(course_map[highlighted_courses[0]]);
                d3.select('li.course-' + course_map[highlighted_courses[0]].className).classed('ui-selected', true);
            }, 1000);

        };
    });

    var courseNames = [];
    for (var c in course_map) {courseNames.push(course_map[c]['displayName'])}
    var default_search_text = 'Search Courses'
    // autocomplete for courses search bar
    $( "#courseListSearchInput").autocomplete({
        source : courseNames,
        select: function(event, ui) {
            // reset selected courses
            selectCourses = [];
            var course = course_map[createClassName(ui.item.label)];
            pan_to_course(course);
            if (d3.selectAll('.prevArch')._groups[0].length != 0) {

                selectCourses = [];
                courseCount = {};
            }
            d3.selectAll(".courseList > li.ui-selected").classed('ui-selected', false)
            d3.select('.course-' + createClassName($("#courseListSearchInput").val())).classed('ui-selected', true);
            // ensure that we're only selecting on the LI selection
            refresh_chart(course);
            scroll_courses_list(course);
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
            selectCourses.push(course);
            refresh_points(selectCourses);
            $(ui.selected).addClass('prevCourse');
            $('#courseListSearchInput').val(default_search_text)
                .css('color', '#929292');
        }
    }).focusout(function() {
        $( "#courseListSearchInput").val(default_search_text)
            .css('color', '#929292');
    });
    // set default value
    $('#courseListSearchInput').val(default_search_text)
        .css('color', '#929292');
    $('#courseListSearchInput')
        .focus(function() {
            if ($(this).val() === default_search_text) {
                $(this).val('')
                    .css('color', 'black')
            } else {
                $(this).val('')
                    .css('color', '#929292')
            }
        })

    // add listeners for arrow keys
    $(document).keydown(function(e) {
        // variable to determine if autoselect should override arrow keys
        // if true, autoselect should override and do not allow arrow keys to use list scroll
        var autoSelectOverride = $('ul.ui-autocomplete').css('display') === 'none';
        if (autoSelectOverride) {
            switch(e.which) {
                case 38: // up
                    if ($('li.ui-selected').length === 1) {
                        var first_index = $('li.ui-selected').index() + 1;
                        if (first_index !== 1) {
                            // deselect all highlighted courses

                            d3.selectAll('.highlighted_point').classed('highlighted_point', false);
                            $(".courseList  li:nth-child(" + String(first_index) + ")").removeClass('ui-selected');
                            $(".courseList  li:nth-child(" + String(first_index - 1) + ")").addClass('ui-selected');

                            var displayName = $(".courseList  li:nth-child(" + String(first_index - 1) + ") > span").last().text();
                            var course = course_map[createClassName(displayName)];
                            refresh_chart(course);
                            bring_course_to_view(course);
                            refresh_points([course]);
                            d3.selectAll('.highlighted_point').classed('highlighted_point',false);
                            var top = $('.course.course-' + course['className']).position().top;
                            if (top < 65) {
                                $('.courseList').animate({
                                    scrollTop: top + $('.courseList').scrollTop() - 65
                                }, 500);
                            }
                        }
                    }
                    break;
                // scroll down is always 2 off
                // course used for chart is 2 above highlighted course
                case 40: // down
                    if ($('li.ui-selected').length === 1) {
                        var first_index = $('li.ui-selected').index() + 1;
                        var bottom_of_list = $('.courseList').height() + 50;
                        if (first_index !== $('.courseList > li').length - 1) {
                            $(".courseList  li:nth-child(" + String(first_index) + ")").removeClass('ui-selected');
                            $(".courseList  li:nth-child(" + String(first_index + 1) + ")").addClass('ui-selected');
                            var displayName = $(".courseList  li:nth-child(" + String(first_index + 1) + ") > span").last().text();
                            var course = course_map[createClassName(displayName)];
                            refresh_chart(course);
                            bring_course_to_view(course);
                            refresh_points([course]);
                            var top = $('.course.course-' + course['className']).position().top;
                            if (top > bottom_of_list) {
                                $('.courseList').animate({
                                    scrollTop: top + $('.courseList').scrollTop() - 65
                                }, 500);
                            }
                        }
                    }
                    break;

                default: return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)
        }

    });
}

function update_autocomplete_source() {
    var valid_courses = get_valid_courses().map(function(c) {return c.displayName});
    $('#courseListSearchInput').autocomplete('option','source',valid_courses);
}

function sort_rankings(rankings) {
    return rankings.sort(function(a, b) {
        var a_year = parseInt(a.split('_')[1]);
        var b_year = parseInt(b.split('_')[1]);
        return  a_year - b_year
    })
}

// get composite points for a given course
// rank_decay_map: map of rankings to their decay value. ex: {rank : decay_value}
// only contains keys for rankigns that are currently selected
function get_course_composite_points(course, rank_decay_map) {
    // need to ultimately find the decay factor for a given ranking
    // for each ranking a course is ranked in, map to a decay pct as a function of that ranking's index in the all and
    // public rankings selected
    // valid_all_ranks is intersection of valid_all_ranks and all_ranks that course is ranked in
    var valid_all_ranks = Object.keys(course.rankings)
        .filter(function(r) {return (r in rank_decay_map) && r.indexOf('All') !== -1});

    var total_points = 0;
    var is_all;
    if (valid_all_ranks.length > 0) {
        // only years that will be considered in points (last 6)
        for (var r in valid_all_ranks) {
            var rank = valid_all_ranks[r];

            total_points += rank_decay_map[rank] * get_ranking_points(course, rank);

        }
        is_all = true;
    } else {
        // only use public_ranks
        var valid_public_ranks = Object.keys(course.rankings)
            .filter(function(r) {return (r in rank_decay_map) && r.indexOf('Public') !== -1});
        for (var r in valid_public_ranks) {
            var rank = valid_public_ranks[r];
            total_points += rank_decay_map[rank] * get_ranking_points(course, rank);
        }
        is_all = false;

    }
    return [total_points, is_all]
}


function composite_sort(courses) {


    // list of (course, points) tuple for both types of courses
    var all_course_points_list = [];
    var public_course_points_list = [];

    var valid_rankings = get_selected_rankings();
    var all_rankings = sort_rankings(valid_rankings.filter(function(rank) {return rank.indexOf('All') !== -1})).reverse();
    var public_rankings = sort_rankings(valid_rankings.filter(function(rank) {return rank.indexOf('Public') !== -1})).reverse();


    var ranking_decay_map = gen_ranking_decay_maps();


    for (var c in courses) {
        var course = courses[c];
        var course_point_list = get_course_composite_points(course, ranking_decay_map);
        if (course_point_list[1]) {
            all_course_points_list.push([course,course_point_list[0]])
        } else {
            public_course_points_list.push([course, course_point_list[0]])
        }
    }
    public_course_points_list.sort(function(a,b) {return b[1] - a[1]})
    all_course_points_list.sort(function(a,b) {return b[1] - a[1]})
    var course_list = all_course_points_list.concat(public_course_points_list);
    return course_list.map(function(c) {return c[0]});
}

// generates and returns ranking_decay_maps for all and public rankings
// in form {ranking_name : decay_pct}
// NOT specific to a single course, for all selected rankings
function gen_ranking_decay_maps() {
    var valid_rankings = get_selected_rankings();
    // generate sorted lists of each ranking
    var gDigest_All = valid_rankings.filter(function(rank) {
        var split_rank = rank.split('_');
        return split_rank[0] == 'GDigest' && split_rank[2] == 'All';
    }).sort(function(a,b) {
        return parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]);
    });
    var gDigest_Public = valid_rankings.filter(function(rank) {
        var split_rank = rank.split('_');
        return split_rank[0] == 'GDigest' && split_rank[2] == 'Public';
    }).sort(function(a,b) {
        return parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]);
    });
    var golf_All = valid_rankings.filter(function(rank) {
        var split_rank = rank.split('_');
        return split_rank[0] == 'Golf' && split_rank[2] == 'All';
    }).sort(function(a,b) {
        return parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]);
    });
    var golf_Public = valid_rankings.filter(function(rank) {
        var split_rank = rank.split('_');
        return split_rank[0] == 'Golf' && split_rank[2] == 'Public';
    }).sort(function(a,b) {
        return parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]);
    });

    var decay_amounts = [1,.8,.6,.4,.2,.1,.05,.03,.01];

    var rank_map = {};
    for (var r in valid_rankings) {
        if (valid_rankings.hasOwnProperty(r)) {
            var rank = valid_rankings[r];
            if (rank.split('_')[0] == 'GDigest' && rank.split('_')[2] == 'All') {
                rank_map[rank] = decay_amounts[gDigest_All.indexOf(rank)]
            } else if (rank.split('_')[0] == 'GDigest' && rank.split('_')[2] == 'Public') {
                rank_map[rank] = decay_amounts[gDigest_Public.indexOf(rank)]
            } else if (rank.split('_')[0] == 'Golf' && rank.split('_')[2] == 'All') {
                rank_map[rank] = decay_amounts[golf_All.indexOf(rank)]
            } else if (rank.split('_')[0] == 'Golf' && rank.split('_')[2] == 'Public') {
                rank_map[rank] = decay_amounts[golf_Public.indexOf(rank)]
            }
        }
    }
    return rank_map

}


// function to get points for a course in a ranking. if course doesnt exist return 0
function get_ranking_points(course, ranking) {
    if (ranking in course.rankings){
        return 101 - course.rankings[ranking];
    } else {
        return 0
    }
}

function get_unique_list(l) {
    var ul = [];
    $.each(l, function(i, el){
        if($.inArray(el, ul) === -1) ul.push(el);
    });
    return ul.sort();
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
    // remove old picture and logo
    $('.coursePic').remove();
    $('.courseLogo').remove();
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
        .attr('d',function(d) { return lineGen(d.ranks)})
        .on('mouseover', function(d) {
            d3.event.stopPropagation();
        });
    // construct data for dots representing a single ranking
    var point_data = containerData.map(function(d) {
        return d.ranks
    });
    // flatten point data
    point_data = [].concat.apply([], point_data);

    svg.selectAll('circle')
        .data(point_data)
        .enter().append('circle')
        .attr('cx', function(d) {return xScale(+d.year); })
        .attr('cy', function(d) {
            return yScale(d.rank); })
        .style('fill', function(d) {return  lineColors[d.className]})
        .attr('class', function(d) {return 'chartDot'
        })
        .on("mouseover", function(d) {
            chartTooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("background-color", 'lightgray');
            chartTooltip.html( d['rank']+ '<br>' + d['year'])
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            chartTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .attr('r', 4);



    d3.select('#coursePictureDiv')
        .append('img')
        .attr('class', 'coursePic')
        .attr('src', 'Data/images/course_pictures/' + course['className'] + '.jpeg');
    var el = $('.' + course.className + '.point');

    updateCourseLegend(containerData, course);
}

// function to center on course if it is out of view
function bring_course_to_view(course) {

    var el = $('.' + course.className + '.point');

    // if course is out of view, pan to it. if not see if it is behind a list
    if (!isElementInViewport(el)) {
        pan_to_course(course);
    } else {
        // course is behind a list if it is in left x pixels or right y pixels
        var coords = projection(course.geometry.coordinates);
        var left_chart_end = 315;
        var right_chart_start = $(window).width() - 295;
        if (coords[0] < left_chart_end || coords[0] > right_chart_start) {
            pan_to_course(course);
        }
    }

}

function scroll_courses_list(course) {
    var top = $('.course.course-' + course['className']).position().top;
    $('.courseList').animate({
        scrollTop: top + $('.courseList').scrollTop() - 65
    }, 500);
}

// function to add headings and lists to courses and architects lists
function initialize_container_lists() {
    var courseUl = $('#courses').append($("<ul></ul>").addClass("courseList"));
    var architectUl = $('#architects').append($('<ul></ul>').addClass("architectList"));
}

// function to initially draw chart and container
function initialize_chart() {
    $('#chart').empty();
    $('.courseInformationContainer').remove();
    // chart size variables
    var margin = {top: 10, right: 10, bottom: 13, left: 15},
        width = 300 - margin.left - margin.right,
        chartHeight =  $('#chart').height() - margin.top - margin.bottom;
    var xAxis_buffer = 5;
    xScale = d3.scaleLinear().range([width, margin.right + margin.left]).domain([2017, 2000]);
    yScale = d3.scaleLinear().range([chartHeight - margin.bottom - xAxis_buffer, margin.top]).domain([100, 1]);
    var x = d3.scaleLinear().range([width - margin.left, margin.right]);
    var y = d3.scaleLinear().range([margin.top, chartHeight - margin.bottom - xAxis_buffer]);

    x.domain([2017, 2000]);
    y.domain([1, 100]);

    var valueline = d3.line()
        .x(function(d) {return x(parseInt(d.year)); })
        .y(function(d) {return y(d.rank); });
    var yTicks = [1,10,20,30,40,50,60,70,80,90,100];
    // add svg canvas
    var chartSVG = d3.select('#chart')
        .append("svg")
        .attr("class", 'chart')
        .attr('id', 'chartSVG')
        .attr('width', width + margin.left + margin.right)
        .attr('height', chartHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // add axis
    chartSVG.append("svg:g")
        .attr("transform", "translate(" + margin.left + "," + (chartHeight - margin.bottom) + ")")
        .call(d3.axisBottom(x)
            .tickFormat(function(d) {
                return "'" +  String(d).slice(2,4)
            }));
    chartSVG.append("svg:g")
        .attr('transform', "translate(" + (margin.left) + ",0)")
        .call(d3.axisLeft(y)
            .tickValues(yTicks));


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
        .attr('class', 'courseRecentRankingsDiv')

    // for title of course
    courseInfo.append('h3')
        .text("")
        .attr('class', 'courseInfoHeader headingDiv');

    var courseInfoPicContainer = courseInfo
        .append('div')
        .attr('class', 'coursePicInfoContainer');


    var courseInfoContainer = courseInfoPicContainer
        .append('div')
        .attr('class', 'courseInfoContainer');

    var course_pic_container = courseInfoPicContainer
        .append('div')
        .attr('class', 'coursePicContainer');

    // for location and type
    // ex: Augusta, GA (private)
    courseInfoContainer.append('h3')
        .text("")
        .attr("class", "courseLocTypeInfo infoH");
    // for architect and year
    // ex: Architect: Allister Mackenzie (1921)
    courseInfoContainer.append('h3')
        .text("")
        .attr("class", "courseArchYearInfo infoH");
    // for yardage
    // ex: Yardage: 7445
    courseInfoContainer.append('h3')
        .text("")
        .attr("class", "courseYardageInfo infoH");
    // for rating
    // ex: Rating: 76.2
    courseInfoContainer.append("h3")
        .text("")
        .attr("class","courseSlopeRatingInfo infoH");


    courseRecentRankings.append("h3")
        .text("Recent Rankings")
        .attr('class', 'recentRankingsHeader headingDiv');





    var recentRankingsUlHeader = d3.select('.courseRecentRankingsDiv').append('div')
        .attr('class', 'recentRankingsListHeader');
    recentRankingsUlHeader.append('span')
        .text('publication')
        .attr('class', 'recentRankingsUlHeadSpan pubSpan');
    recentRankingsUlHeader.append('span')
        .text('year')
        .attr('class', 'recentRankingsUlHeadSpan yearSpan');
    recentRankingsUlHeader.append('span')
        .text('rank')
        .attr('class', 'recentRankingsUlHeadSpan rankSpan');

    d3.select('.courseRecentRankingsDiv').append('ul')
        .attr('class', 'recentRankings-ul');




}



// function to clear legend of all contents
function clearLegend() {
    d3.select(".courseInfoHeader")
        .text("");
    d3.selectAll(".courseLocTypeInfo")
        .text("");
    d3.selectAll(".courseArchYearInfo")
        .text("");
    d3.selectAll(".courseYardageInfo")
        .text("");
    d3.selectAll(".courseYardageInfo")
        .text("");
    d3.selectAll(".courseSlopeRatingInfo")
        .text("");
    $(".legendRanking").remove();
    d3.selectAll(".chart > g svg").remove();
    $('.courseLogo').remove();
    $('.coursePic').remove();

}

function clear_ranking_filter() {
    d3.selectAll('.rankingRect').classed('selected', true)
        .classed('unselected', false)
        .attr('fill', function(d) {
            if (d['publication'] === 'Golf') {return d['type'] == 'Public' ?  lineColors['Golf_Public'] : lineColors['Golf_All'];}
            if (d['publication'] === 'GDigest') {return d['type'] == 'Public' ?  lineColors['GDigest_Public'] : lineColors['GDigest_All'];}
        });
    refresh_map();

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
            .appendTo($('#' + type  + 'SelectDiv'));
        $('<label />', {'for': 'cb_type_' + type, class: 'checkText', text: ''})
            .appendTo($('#' + type + 'SelectDiv'));
    }

    d3.select('#publicSelectDiv')
        .append('div')
        .attr('class', 'publicTextDiv courseTypeTextDiv')
        .append('text')
        .text('public')

    d3.select('#privateSelectDiv')
        .append('div')
        .attr('class', 'privateTextDiv courseTypeTextDiv')
        .append('text')
        .text('private')

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
        values:     [2001, 2017],
        min:2001,
        max:2017,
        left: 2001,
        right: 2017,
        gap : 0,
        slide: function(event, ui) {
            var text;
            if (ui.values[0] === ui.values[1]) {
                text = ui.values[0];
            } else {
                text = ui.values[0] + " to " + ui.values[1];
            }
            $('#yearSelectHeader').text(text);

            refresh_map();
        }
    });
    $('#yearSelectHeader').text("2001 to 2017");
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
        max:2017,
        value:2017,
        slide: function(event, ui) {
            var year = $("#slider").slider("option","value");
            $("#year").val(year);
            if (parseInt(year) % 5 === 0) {
                refresh_map();
            }
        },
        stop: function(event, ui) {
            $("#year").val($("#slider").slider("option","value"));
            refresh_map();
        }
    });

    $("#year").val(2017);

}
// updates map, courses and architects list
function refresh_map() {

    var valid_courses = composite_sort(get_valid_courses())
    var valid_rankings = get_selected_rankings();

    // defaults to alphabetical...
    if (!$('.orderedSortDiv').hasClass('active')) {
        $('.orderedSortDiv').removeClass('inactive')
            .addClass('active')
        $('.alphabeticalSortDiv').addClass('inactive').removeClass('active')
    } else {
        if (!$('.orderedSortDiv > svg').hasClass('glyphicon-arrow-down')) {
            $('.orderedSortDiv > svg').removeClass('glyphicon-arrow-up')
                .addClass('glyphicon-arrow-down')
        }
    }

    refresh_points([]);
    clearChart();
    clearLegend();
    update_course_list(valid_courses);
    update_architect_list(valid_courses);
    update_autocomplete_source();
}

function get_highlighted_courses() {
    var highlighted_points = d3.selectAll('.highlighted_point')._groups[0];
    var highlighted_courses = []
    for (var node in highlighted_points) {
        if (highlighted_points.hasOwnProperty(node)) {
            highlighted_courses.push(highlighted_points[node].__data__);
        }
    }
    return highlighted_courses
}

// generates list of valid courses based on publication type, pub_year and course year
function get_valid_courses() {

    var filtered_rankings = get_selected_rankings();

    var valid_types = [];
    var valid_year = +$("#slider").slider("option","value");

    // find valid types
    $('.cb_type:checked').each(function() {
        valid_types.push($(this).val());
    });


    // find list of valid courses from valid rankings
    // first: map ranking -> courses
    // second: reduce from [[courses], [courses], [courses]] -> [courses]
    // third: map pine valley -> pine_valley
    // fourth(uniq function): remove duplicates by converting to set then back to array
    // fifth: map cNape -> course(object)

    // return an empty array if there are no valid rankings
    if (filtered_rankings.length === 0) {
        return [];
    }

    var valid_courses = uniq(filtered_rankings.map(function(r) {
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

    return valid_courses;


}



// removes old points if they exist and adds new points
// courses: list of courses to be mapped
// courses is selected courses
function refresh_points(courses) {

    // map courses to add geometry
    var highlighted_courses = courses.map(function(c) {return type(c)});
    var all_course_names = get_valid_courses().map(function(c) {return c.className})
    var highlighted_course_names = highlighted_courses.map(function(c) {return c['className']});
    var non_highlighted_course_names = arr_diff(all_course_names, highlighted_course_names);
    var all_courses = all_course_names.map(function(c) {return type(course_map[c])})
    var non_highlighted_courses = non_highlighted_course_names.map(function(c) {return type(course_map[c])})

    // empty pointLayer
    $('.pointLayer').empty();

    // map select courses
    var all_points = d3.select('.pointLayer').selectAll('.non_highlighted_point')
        .data(non_highlighted_courses)
        .enter()
        .append('circle')
        .attr('cx', function(d) {
            return projection(d.geometry.coordinates)[0]})
        .attr('cy', function(d) {
            return projection(d.geometry.coordinates)[1]})
        .attr('r', 5)
        .style("fill", function(c) {
            return course_type_colors[c.type];
        })
        .attr('class', function(d) {return d.className + ' point non_highlighted_point'})
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 1)
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
            d3.selectAll('.point')
                .style('fill', function(c) {
                    return course_type_colors[c.type];
                })
                .attr('r', 5)
                .attr('class', function(d) {return 'point ' + d.className})
                .style('stroke', 'black')
                .style('stroke-width','1px');
            d3.select(this)
                .style('fill', '#ffdc16')
                .attr('r', 8)
                .style("stroke", function(c) {
                    return course_type_colors[c.type];
                })
                .style('stroke-width', '3px')
                .attr('class', function(d) {return d.className +  ' point highlighted_point'});


            d3.selectAll(".courseList > li.ui-selected").classed('ui-selected', false)
            d3.select('.course-' + d['className']).classed('ui-selected', true);
            refresh_chart(d);
            scroll_courses_list(d);
            d3.event.stopPropagation();
        });

    // highlighted courses
    var highlighted_points = d3.select('.pointLayer').selectAll('.highlighted_point')
        .data(highlighted_courses)
        .enter()
        .append('circle')
        .attr('cx', function(d) {
            return projection(d.geometry.coordinates)[0]})
        .attr('cy', function(d) {
            return projection(d.geometry.coordinates)[1]})
        .attr('r', 8)
        .style("fill",'yellow')
        .style('stroke', function(c) {
            return course_type_colors[c.type];
        }).style('stroke-width', '3px')
        .attr('r', 8)
        .attr('class', function(d) {return d.className + ' point highlighted_point'})
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
            d3.selectAll('.point')
                .style('fill', function(c) {
                    return course_type_colors[c.type];
                })
                .attr('r', 5)
                .style('stroke-width', '1px')
                .style('stroke', 'black')


            d3.select(this)
                .style('fill', 'yellow')
                .style('stroke', function(c) {
                    return course_type_colors[c.type];
                }).style('stroke-width', '3px')
                .attr('r', 8);
            refresh_chart(d);
            scroll_courses_list(d);
            d3.event.stopPropagation();
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
        .style("height", h)
        .on('click', function(d) {
            // reset map when any point on map is clicked (not a course)
            reset_map();
        });

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

    zoom_scale = 1 << 12;
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

function pan_to_course(course) {

    var h = $(window).height();
    var w = $(window).width();

    projection
        .scale(1 / tau)
        .translate([0, 0]);

    var c_proj = projection(course['geometry']['coordinates'])
    svg.call(zoom)
        .transition()
        .duration(2000)
        .call(zoom.transform, d3.zoomIdentity
            .translate(w / 2, h / 2)
            .scale(zoom_scale)
            .translate(-c_proj[0], -c_proj[1]));

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

        if (selectedCourses.length === 1) {
            refresh_chart(selectedCourses[0])
        }
        refresh_points(selectedCourses);
        update_course_list(selectedCourses);
        update_architect_list(selectedCourses);
        rubberBand = null;
        window.getSelection().empty();

    }

}


// clear chart of all text and plots
function clearChart() {
    d3.selectAll(".chart > g svg").remove();
    $(".legend-name").text("");
    $(".legend-architects").text("");
    $(".legend-year").text("");
    $(".legend-type").text("");

    // deselect course from list if selected
    $(".ui-selected").removeClass('ui-selected');
}




// function to zoom map. Queries new tiles
// TODO: add functionality to update points if they exist
function zoomed() {

    var transform = d3.event.transform;
    zoom_scale = transform.k
    var tiles = tile
        .scale(transform.k)
        .translate([transform.x, transform.y])
        ();

    projection
        .scale(transform.k / tau)
        .translate([transform.x, transform.y]);
    d3.selectAll(".point")
        .attr("cx", function(d) {
            return projection(d.geometry.coordinates)[0]})
        .attr("cy", function(d) {return projection(d.geometry.coordinates)[1]});

    var image = raster
        .attr("transform", stringify(tiles.scale, tiles.translate))
        .selectAll("image")
        .data(tiles, function(d) { return d; });

    image.exit().remove();

    image.enter().append("image")
        .attr("xlink:href", function(d) {
            return "http://" + "abc"[d[1] % 3] + ".basemaps.cartocdn.com/light_all/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"})
        .attr("x", function(d) { return d[0] * 256; })
        .attr("y", function(d) { return d[1] * 256; })
        .attr("width", 256)
        .attr("height", 256);
}


function zoomUp() {
    endRubberBand();
}

// function to update course list8
function update_course_list(courses) {
    $('.courseHeading > text').text('Courses (' + courses.length + ' shown)');
    var class_name_list = courses.map(function(d) {return d.className});
    var class_map = {};
    for (var c in class_name_list) {
        class_map[class_name_list[c]] = parseInt(c) + 1
    }
    // select the courses list
    var courseSelect = d3.select("#courses ul").selectAll('.course')
        .data(courses, function(d,i){return d.className+'-'+i;});


    // defines all elements entering the DOM
    var courseEnter = courseSelect.enter().append('li')
        .attr('class',function(d){return 'course course-'+d.className;});

    // adds left span
    courseEnter.append('span')
        .text ("")
        .style('float', 'left')
        .style("border", "none");

    var rank_decay_map = gen_ranking_decay_maps();

    // add course rank if in composite rank
    if ($('.orderedSortDiv').hasClass('active')) {
        courseEnter.append('span')
            .attr('class', 'rankSpan')
            .text(function(d,i) {
                if ($('.orderedSortDiv > span').hasClass('glyphicon-arrow-down')) {
                    return parseInt(class_map[d.className]);
                } else {
                    return parseInt(courseEnter.data().length - class_map[d.className] + 2);
                }
            });
        courseEnter.merge(courseSelect)
            .selectAll('.rankSpan')
            .text(function(d,i) {
                if ($('.orderedSortDiv > span').hasClass('glyphicon-arrow-down')) {
                    return parseInt(class_map[d.className]);
                } else {
                    return parseInt(courseEnter.data().length - class_map[d.className] + 2);
                }
            });


    }
    // adds course name
    courseEnter.append('span')
        .attr('class', 'nameSpan')
        .text ( function(a) {
            return a.displayName;
        });

    courseSelect.exit()
        .transition()
        .duration(250)
        .delay(function(d,i) {
            return i * 1.2;
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

    // ranking select, course filter and architect list take contant size, courses list will shrink and grow
    // as the window is resized

    var windowHeight = $(window).height();
    $("#rankingCourseSelectDiv").height(180);
    $('#courseFilterDiv').height(80);
    $('#architects').height(100);

    $('#courses').height(windowHeight - 380);
    $('.courseList').height(windowHeight - 380 - 75);
    initialize_chart();

    var highlighted_points = d3.selectAll('.highlighted_point')._groups;
    if (highlighted_points[0][0] && highlighted_points[0].length == 1) {
        refresh_chart(highlighted_points[0][0].__data__);

    }


}


function leftControlResize() {

    var windowHeight = $(window).height();
    $('#coursePictureDiv').height(130);
    $('#courseInformationContainer').height(180);
    $('#chartSVG').height(windowHeight - 310);


}


function updateCourseLegend(containerData, course) {

    $(".recentRankings-ul > li").remove();
    d3.selectAll(".legend")
        .data(containerData);
    d3.select(".courseInfoHeader")
        .text(course.displayName);

    d3.selectAll(".courseLocTypeInfo")
        .text(course.city + ', ' + course.state + '   (' + course.type + ')')
    d3.selectAll(".courseArchYearInfo")
        .text('Architect: ' + architectsToString(course.architects) + ' (' + course.yearCreated[0] + ')');

    d3.selectAll(".courseYardageInfo")
        .text("Yardage: " + course.yardage);

    if (course.rating !== -1) {
        d3.selectAll(".courseSlopeRatingInfo")
            .text("rating: " + course.rating + "  slope: " + course.slope);
    } else {
        d3.selectAll(".courseSlopeRatingInfo")
            .text("Slope and rating unavailable");
    }


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

// compute difference between two arrays
function arr_diff (a1, a2) {

    var a = [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
}

function isElementInViewport (el) {

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}
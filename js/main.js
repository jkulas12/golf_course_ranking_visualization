/**
 * Created by joshuakulas on 12/30/15.
 */
var courses;
var filteredCourses;
var currentRanking = 'all';
var allCourses = [];
var allArchitects = [];
var allRankings = [];
var currentRankingCourses = [];
var courseMap;
var chart;
var chartRankingData;
var selectableRankings = [];
var rubberBand = null;
var mapCourses;
var annotG;
var coursesToShow = 'all';
var datasets;
var tooltip;
var selectCourses;
var architectMap;
var rankingsMap;
var coursePoints;
var lineColors = {

    'GDigest_All' : "#0000E6",
    'GDigest_Public' : "#E60000" ,
    'Golf_All' : "#80B3ff",
    'Golf_Public' : "#FF8080"

};

var pubDisplayNames = {
    'GDigest All' : "Golf Digest All",
    'Golf All' : 'Golf Mag. All',
    'GDigest Public' : 'Golf Digest Public',
    'Golf Private' : 'Golf Private',
    'GDigest' : 'Golf Digest',
    'Golf' : 'Golf Mag.'
};
var pubClassNames = {
    'Golf Digest' : "GDigest",
    'Golf Mag.' : "Golf"
};

loadMap();





// Initial Function to create visualization
function loadMap() {
    $(window).on("resize", function() {
        var h = $(window).height();
        var w = $(window).width();
        $("#main").height(h)
            .width(w);
        // function to resize right pane without changing height of upper right div
        rightControlResize();
        // adjust chart size
        createChart();
    });
    $(window).on("load", function() {
        var h = $(window).height();
        var w = $(window).width();
        $("#main").height(h)
            .width(w);
        createChart();
        initializeSlider();
        loadData();
        initializeSelectable();
        rightControlResize();
        $("input[name='courseType'][value='all']").prop('checked', true);
        var map = d3.select("#map");
    });
}


// load all ranking in datasets list
function loadData() {


    // set year for slider as 2016
    $("#year").val(2016);
    // all datasets available
    datasets = [
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
    // map of courses for all rankings
    courseMap = {};
    // map of architects for all rankings
    architectMap = {};
    // map of all rankings
    rankingsMap = {};

    // index of ranking being processed
    var index = 0;

    // initialize buttons to change course selection type
    $("#publicButton").click(function() {
        if ($(this).hasClass("active")) {
            // public is being unselected but private is selected
            // only show private courses
            coursesToShow = "private";
            $("#allRankingsHeader").html("All Private Courses");
            updateCoursesFilter();
            if ($("#privateButton").hasClass("active")) {
                $(this).removeClass("active");
            // private is not classed so it will be switched to private
            } else {
                $("#privateButton").addClass("active");
                $(this).removeClass("active");
            }
        } else {
            // private is selected so show all
            $(this).addClass("active");
            if ($("#privateButton").hasClass("active")) {
                coursesToShow = "all";
                $("#allRankingsHeader").html("All Courses");
                $(this).addClass("active");
            } else {
                // don't think it will ever get here
                coursesToShow = "public";
                $("#allRankingsHeader").html("All Public Courses");
                $(this).addClass("active");
            }
        }
        $('.infoH').text("");
        $('.legendRanking').empty();

        updateCoursesFilter();
        courses = filterCourses();
        updateArchitects(courses);
        updateCourses(courses);
    });
    $("#privateButton").click(function() {
        if ($(this).hasClass("active")) {
            // public is being unselected but private is selected
            // only show private courses
            coursesToShow = "public";
            $("#allRankingsHeader").html("All Public Courses");
            updateCoursesFilter();
            if ($("#publicButton").hasClass("active")) {
                $(this).removeClass("active");
                // private is not classed so it will be switched to private
            } else {
                $("#publicButton").addClass("active");
                $(this).removeClass("active");
            }
        } else {
            // private is selected so show all
            $(this).addClass("active");
            if ($("#publicButton").hasClass("active")) {
                coursesToShow = "all";
                $("#allRankingsHeader").html("All Courses");
                $(this).addClass("active");
            } else {
                // don't think it will ever get here
                coursesToShow = "private";
                $("#allRankingsHeader").html("All Private Courses");
                $(this).addClass("active");
            }
        }
        $('.infoH').text("");
        $('.legendRanking').empty();


        updateCoursesFilter();
        courses = filterCourses();
        updateArchitects(courses);
        updateCourses(courses);
    });


    // loop through datasets and load data for each ranking
    datasets.forEach(function(d) {
        $.getJSON("Data/Rankings/" + d + ".json", function(json) {
            // array of architects for a given ranking
            architects = {};
            // array of courses for a given ranking
            courses = [];
            // publication information for a ranking
            publication = {
                className : createClassName(json.Publication),
                displayName : json.Publication
            };
            ranking = {
                className : d,
                publication : publication,
                year : json.Year,
                type : json.Type,
                courses : [],
                architects : []
            };
            // populates courses
            // populates architects
            json.Courses.forEach(function(c) {
                // creates class name for given course c
                var className = createClassName(c.CourseName);
                // do if course is not in courseMap
                if (!courseMap.hasOwnProperty(className)) {
                    // array of architects for a given course
                    var tects = [];
                    // if there are two architects, create array containing both architects
                    if (c.Architect.indexOf("_") > -1) {
                        var archs = c.Architect.split("_");
                        archs.forEach(function(a) {
                            var arch;
                            // if the architect does not exist in architectMap, create it and push it
                            if (!architectMap.hasOwnProperty(createClassName(a))) {
                                arch = {
                                    displayName : a,
                                    className : createClassName(a),
                                    count : 1,
                                    courses : [],
                                    coarchitects : [],
                                    rankings : {}
                                };
                                architects[arch.className] = arch;
                            } else {
                                arch = architectMap[createClassName(a)];
                            }
                            if (!architects.hasOwnProperty(createClassName(a))) {
                            }
                            tects.push(arch);
                        });
                        // if only one architect for a given course
                    } else {
                        var a = c.Architect;
                        var arch;
                        // if architect doesn't exist in architectMap, create and push
                        if (!architectMap.hasOwnProperty(createClassName(a))) {
                            arch = {
                                displayName : a,
                                className : createClassName(a),
                                count : 0,
                                courses : [],
                                coarchitects : [],
                                rankings : {}
                            };
                            architectMap[createClassName(a)] = arch;
                        } else {
                            arch = architectMap[createClassName(a)];
                        }
                        // If architect is not in architects map, add
                        if (!architects.hasOwnProperty(createClassName(a))) {
                            architects[arch.className] = arch;
                        }
                        tects.push(arch);
                    }
                    var years;
                    if (typeof c.Year != 'string') {
                        years = String(c.Year);
                    } else {
                        years = c.Year;
                    }
                    if (years.indexOf("_") > -1) {
                        years = years.split("_");
                    } else {
                        years = [years]
                    }
                    // handle case where coordinates are not array but string
                    if (typeof c.Coordinates === 'string') {
                        c.Coordinates = c.Coordinates.slice(1, c.Coordinates.length - 2);
                        c.Coordinates = c.Coordinates.split(",");
                    }
                    course = {
                        displayName : c.CourseName,
                        className : createClassName(c.CourseName),
                        yearCreated : years,
                        rankings : {},
                        coordinates : c.Coordinates,
                        x : c.Coordinates[1],
                        y : c.Coordinates[0],
                        architects : tects,
                        type: c.Type
                    };
                    course.rankings[ranking.className] = ranking;

                    course.architects.forEach(function(a) {
                        a.courses.push(course);
                        a.count++;
                        if (!architects.hasOwnProperty(a.className)) {
                            architects[a.className] = a;
                        }
                    });
                } else {
                    course = courseMap[createClassName(c.CourseName)];
                }
                course.rankings[ranking.className] = {
                    ranking : ranking,
                    rank : c.Ranking
                };
                courses.push(course);
            });
            // adds courses to rankings
            courses.forEach(function(c) {
                ranking.courses.push(c);
            });
            // add architects to rankings
            for (var key in architects) {
                if (architects.hasOwnProperty(key)) {
                    arch = architects[key];
                    ranking.architects.push(arch);
                }
            }
            courses.forEach(function(c) {
                c.rankings[ranking.className].ranking = ranking;
                courseMap[c.className] = c;
            });

            for (var key in architects) {
                if (architects.hasOwnProperty(key)) {
                    architects[key].rankings[ranking.className] = ranking;
                    architectMap[key] = architects[key];
                }
            }
            rankingsMap[d] = ranking;

            index++;
            // when all rankings are loaded
            if (index === datasets.length) {
                d3.csv('Data/supplemental/slopeRatingYardageData.csv', function(slopeData) {
                    //////////////////////////////////////////////////
                    ///////// Code to format data for charts /////////
                    //////////////////////////////////////////////////
                    // map that will hold rankings by ranking type (pub_type) for each course
                    chartRankingData = {};
                    for (var course in courseMap) {
                        // empty map for the rankings for a course
                        var rankings = {};
                        for (var ranking in courseMap[course].rankings) {
                            // split ranking to access publication, type and year
                            var splitRanking = ranking.split("_");
                            // ranking in format pub_type
                            var chartRanking = splitRanking[0] + "_" + splitRanking[2];
                            if (!rankings.hasOwnProperty(chartRanking)) {
                                rankings[chartRanking] = {
                                    displayName: splitRanking[0] + " " + splitRanking[2],
                                    className: splitRanking[0] + "_" + splitRanking[2],
                                    ranks: [{
                                        year: splitRanking[1],
                                        rank: courseMap[course].rankings[ranking].rank,
                                        displayName: splitRanking[0] + " " + splitRanking[2],
                                        className: splitRanking[0] + "_" + splitRanking[2]
                                    }]
                                }
                            } else {
                                rankings[chartRanking].ranks.push({
                                    year: splitRanking[1],
                                    rank: courseMap[course].rankings[ranking].rank,
                                    className: splitRanking[0] + "_" + splitRanking[2],
                                    displayName: splitRanking[0] + " " + splitRanking[2]
                                })
                            }
                        }
                        chartRankingData[course] = {
                            rankings: rankings,
                            displayName: courseMap[course].displayName
                        }
                    }

                    rankingsMap['all'] = {
                        architects: allArchitects,
                        courses: allCourses,
                        className: "all_rankings",
                        displayName: "All Rankings",
                        type: "all"
                    };

                    for (var key in courseMap) {
                        if (courseMap.hasOwnProperty(key)) {
                            courseMap[key].rankings['all'] = {
                                ranking: rankingsMap['all']
                            };
                            allCourses.push(courseMap[key]);
                        }
                    }
                    for (var key in architectMap) {
                        if (architectMap.hasOwnProperty(key)) {
                            allArchitects.push(architectMap[key])
                        }
                    }
                    for (var key in rankingsMap) {
                        if (rankingsMap.hasOwnProperty(key)) {
                            allRankings.push(rankingsMap[key]);
                        }
                    }
                    rankingsMap['all'] = {
                        architects: allArchitects,
                        courses: allCourses,
                        className: "all_rankings",
                        displayName: "All Rankings",
                        type: "all"
                    };


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


                    initializeSelectable();

                    // partial set of courses used for selections
                    selectCourses = [];
                    // binds data to course list
                    currentRankingCourses = rankingsMap[currentRanking].courses.filter(function (d) {
                        return $("#slider").slider("option", "value") > d.yearCreated[0];
                    }).sort(function (a, b) {
                        if (currentRanking === 'all') {
                            return a.displayName - b.displayName;
                        } else {
                            return a.rankings[currentRanking].rank - b.rankings[currentRanking].rank;
                        }
                    });

                    // compute recent rankings for a course
                    for (var course in courseMap) {
                        if (courseMap.hasOwnProperty(course)) {

                            // sorted lists by newest of rankings for each course
                            var publicCourseRankings = Object.keys(courseMap[course].rankings)
                                .filter(function (c) {
                                    return c.indexOf("Public") != -1
                                })
                                .sort(function (a, b) {
                                    return parseInt(b.split("_")[1]) - parseInt(a.split("_")[1])
                                });
                            var allCourseRankings = Object.keys(courseMap[course].rankings)
                                .filter(function (c) {
                                    return c.indexOf("All") != -1
                                })
                                .sort(function (a, b) {
                                    return parseInt(b.split("_")[1]) - parseInt(a.split("_")[1])
                                });
                            var publicRecentRanking = -1;
                            var allRecentRanking = -1;
                            // check if public course
                            if (publicCourseRankings.length != 0) {
                                if (publicCourseRankings.length >= 2) {
                                    publicRecentRanking = (courseMap[course].rankings[publicCourseRankings[0]].rank +
                                        courseMap[course].rankings[publicCourseRankings[1]].rank) / 2;
                                } else {
                                    publicRecentRanking = courseMap[course].rankings[publicCourseRankings[0]].rank;
                                }
                            }

                            // logic to set ranking for a course for all courses
                            if (allCourseRankings.length != 0) {
                                if (allCourseRankings.length >= 2) {
                                    allRecentRanking = (courseMap[course].rankings[allCourseRankings[0]].rank +
                                        courseMap[course].rankings[allCourseRankings[1]].rank) / 2;
                                } else {
                                    allRecentRanking = courseMap[course].rankings[allCourseRankings[0]].rank;
                                }
                            }
                            courseMap[course]['allRecentRanking'] = allRecentRanking;
                            courseMap[course]['publicRecentRanking'] = publicRecentRanking;

                        }
                    }

                    for (var course in slopeData) {
                        var cName = createClassName(slopeData[course]['name']);
                        courseMap[cName]['slope'] = +slopeData[course]['slope'];
                        courseMap[cName]['rating'] = +slopeData[course]['rating'];
                        courseMap[cName]['yardage'] = +slopeData[course]['yardage'];
                        courseMap[cName]['par'] = +slopeData[course]['par'];
                        courseMap[cName]['holes'] = +slopeData[course]['holes'];

                    }

                    // add newest and oldest year information to architects
                    for (var architect in architectMap) {
                        if (architectMap.hasOwnProperty(architect)) {
                            var oldestCourse = {
                                className: "",
                                year: -1
                            };
                            var newestCourse = {
                                className: "",
                                year: -1
                            };
                            var topCourses = [];
                            for (var courseIndex in architectMap[architect].courses) {
                                var course = architectMap[architect].courses[courseIndex];
                                if (oldestCourse.year == -1 || parseInt(course.yearCreated[0]) < oldestCourse.year) {
                                    oldestCourse.className = course.className;
                                    oldestCourse.year = parseInt(course.yearCreated[0]);
                                }
                                if (newestCourse.year == -1 || parseInt(course.yearCreated[0]) > newestCourse.year) {
                                    newestCourse.className = course.className;
                                    newestCourse.year = parseInt(course.yearCreated[0]);
                                }
                            }
                            architectMap[architect]['newestCourse'] = newestCourse;
                            architectMap[architect]['oldestCourse'] = oldestCourse;
                            topCourses = architectMap[architect].courses
                                .sort(function (a, b) {
                                    // if they are both ranked in all, use that
                                    if (a.allRecentRanking != -1 && b.allRecentRanking != -1) {
                                        return a.allRecentRanking - b.allRecentRanking;
                                    } else if (a.allRecentRanking != -1 && b.allRecentRanking != -1) {
                                        return 1;
                                    } else if (a.allRecentRanking == -1 && b.allRecentRanking == -1) {
                                        return -1;
                                    } else {
                                        return a.publicRecentRanking - b.publicRecentRanking;
                                    }
                                }).slice(0, 4);

                            architectMap[architect]['topCourses'] = topCourses;
                        }
                    }


                    updateCourses(currentRankingCourses);
                    updateArchitects(currentRankingCourses);

                    // add title div to map


                    // function to make map the first time.
                    makeSomeMaps();
                    addCheckBoxes();
                   tooltip = d3.select("#map").append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);


                })
            }
    })
    });
}

function addCheckBoxes() {
    var years = [];
    var types = ['public', 'private'];
    var publications = ['Golf Digest', 'Golf Mag.'];
    // create array of all unique years in datasets
    for (var d in datasets) {
        var dataset = datasets[d];
        var year = +(dataset.split("_")[1]);
        if (years.indexOf(year) === -1) {
            years.push(year);
        }
    }
    years.sort();
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
    for (var y in years) {
        var year = years[y];
        $('<input />', {type: 'checkbox', id: 'cb_year_' + year, 'class' : 'cb_year',  value:year, checked:true})
            .appendTo($('#yearSelectDiv'));
        $('<label />', {'for': 'cb_year_' + year, class: 'checkText', text: year + " "})
            .appendTo($('#yearSelectDiv'));
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
        updateSelectedCourses();
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
        updateSelectedCourses();
    });

    $('#yearSelectHeader').click(function() {
        if ($('.cb_year:checked').length !== years.length) {
            $('.cb_year:not(:checked)').each(function() {
                $(this).prop('checked',true);
            })
        } else {
            $('.cb_year:checked').each(function() {
                $(this).prop('checked',false);
            })
        }
        updateSelectedCourses();
    });
    // bind event listeners to checkboxes
    $('.cb_year').change( function(){
        updateSelectedCourses()});

    $('.cb_type').change( function(){
        updateSelectedCourses()});

    $('.cb_pub').change( function(){
        updateSelectedCourses()});
}

// function to update courses shown on map and in side panel
// called on checkbox change or on header click
function updateSelectedCourses() {
    var years = [];
    var publications = [];
    var types = [];
    // populate lists for all selected years, publications and types
    $(".cb_pub:checked").each(function() {
        publications.push($(this).val());
    });
    $('.cb_type:checked').each(function() {
        types.push($(this).val());
    });
    $('.cb_year:checked').each(function() {
        years.push(+$(this).val());
    });

    // create array of all courses
    // TODO: fix data structures
    var allCourses = [];
    for (var c in courseMap) {
        allCourses.push(courseMap[c]);
    }
    var filteredCourses = allCourses.filter(function(c) {
        var validPub = false;
        var validYear = false;
        for (var p in c.rankings) {
            var pub = pubDisplayNames[p.split("_")[0]];
            var yr = +p.split("_")[1];
            if (publications.indexOf(pub) !== -1) {validPub = true;}
            if (years.indexOf(yr) !== -1) {validYear = true;}
        }
        return (validYear) &&
            (types.indexOf(c.type) !== -1) &&
            (validPub)
    }).filter(function(d) {
        return $("#slider").slider("option","value") > d.yearCreated[0];
    });
    updateCourses(filteredCourses);
    updateArchitects(filteredCourses);
    updatePointsLayer(filteredCourses);
}




// Function to initialize slider
function initializeSlider(){
    $("#slider").slider({
        range:"max",
        min:1850,
        max:2016,
        value:2016,
        slide: function(event, ui) {
            updateSelectedCourses();
            $("#year").val($("#slider").slider("option","value"));

        }
    });

}







function rightControlResize() {
    var windowHeight = $(window).height();
    $("#rankingsControl").height(200);

    var remainingSpace = windowHeight - 200;


    $("#courses").height(remainingSpace * 0.7);
    $("#architects").height(remainingSpace * 0.28);
}






// clear chart of all text and plots
function clearChart() {
    d3.selectAll(".chart > g svg").remove();
    $(".legend-name").text("");
    $(".legend-architects").text("");
    $(".legend-year").text("");
    $(".legend-type").text("");

}


// updates courses ul
function updateCourses(courseList) {
    //clear chart
    clearChart();
    $(".courseList").empty();
    // handles case when all rankings are displayed and no ranking shown
    if (currentRanking === "all") {
        courseList.sort(function(a,b) {
            if (a.displayName > b.displayName) {
                return 1;
            } else if (b.displayName > a.displayName) {
                return -1;
            } else {
                return 0;
            }
        });
    } else {
        courseList = courseList.sort(function(a,b){
            return a.rankings[currentRanking].rank - b.rankings[currentRanking].rank;
        });
    }
    var courseSelect = d3.select("#courses ul").selectAll('.course')
        .data(courseList, function(d,i){return d.className+'-'+i;});



    // defines all elements entering the DOM
    var courseEnter = courseSelect.enter().append('li')
        .attr('class',function(d){return 'course course-'+d.className;});

    // handles case when all rankings are displayed and no ranking shown
    // TODO: update logic for all courses shown, should be 1 course per ranking
    if (currentRanking === "all") {
        courseEnter.append('span')
            .text ("")
            .style('float', 'left')
            .style("border", "none");
    } else {
        // adds rankings for courses
        courseEnter.append('span')
            .text ( function(a) { return a.rankings[currentRanking].rank; })
            .style('float', 'left');
    }

    // adds course name
    courseEnter.append('span')
        .text ( function(a) {
        return a.displayName;
    });
    courseSelect.exit().remove();
}




// updates architects list
function updateArchitects(courseList) {
    $(".architectList").empty();
    var filteredArchitects = [];
    var filteredArchitectsMap = {};
    courseList.forEach(function(c) {
        c.architects.forEach(function(a) {
            if (!filteredArchitectsMap.hasOwnProperty(a.className)) {
                filteredArchitectsMap[a.className] = a;
                filteredArchitectsMap[a.className].count = a.count;
                filteredArchitectsMap[a.className].courses = a.courses;
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
    architectEnter.append('span')
        .text( function(a) {
            return a.count;
        })
        .style('float', 'right');
    architectSelect.exit().remove();

}







// initializes selectable functionality for architects and courses list
function initializeSelectable() {




        // map to keep track of architects for a given selected course
        var courseCount = {};
        var archCount = {};
        $(".coursesHeadingDiv").selectable({
            selected: function(event,ui) {
                // reset selection
                courseCount = {};
                archCount = {};
                $('.ui-selected').removeClass('ui-selected').addClass('ui-unselecting');
                $('.courseList').data('ui-selectable')._mouseStop(null);
                $('.architectList').data('ui-selectable')._mouseStop(null);
                currentRankingCourses = filterCourses();
                updatePointsLayer(currentRankingCourses);
                updateCourses(currentRankingCourses);
                updateArchitects(currentRankingCourses);
                clearLegend();
            }
        });
        $(".archsHeadingDiv").selectable({
            selected: function(event,ui) {
                // reset selection
                courseCount = {};
                archCount = {};
                currentRankingCourses = filterCourses();
                updatePointsLayer(currentRankingCourses);
                updateCourses(currentRankingCourses);
                updateArchitects(currentRankingCourses);
                clearLegend();
            }
        });


        $(".courseList").selectable({
            selected: function(event,ui) {
                // checks to see if there is a course class in the selected element
                var course = courseMap[$(ui.selected.__data__)[0].className];
                if (d3.selectAll('.prevArch')[0].length != 0) {
                    selectCourses = [];
                    courseCount = {};
                }

                if (ui.selected.tagName == "LI" && courseCount[course.className] != 1) {
                    /////////////////////////////////////////////
                    ////////// Code to generate chart ///////////
                    /////////////////////////////////////////////
                    map.centerOn([course.x,course.y],"latlong",2000);
                    updateChart(course);


                    if (courseCount.hasOwnProperty(course.className)) {
                        courseCount[course.className]++;
                    } else {
                        courseCount[course.className] = 1;
                    }
                    for (var arch in course.architects) {
                        if (archCount.hasOwnProperty(course.architects[arch].className)) {
                            archCount[course.architects[arch].className]++;
                        } else {
                            archCount[course.architects[arch].className] = 1;
                        }
                    }
                    d3.selectAll('.prevArch  > .ui-selected').classed('ui-selected', false).classed('prevArch', false);
                    d3.selectAll('.prevArch').classed('ui-selected', false).classed('prevArch', false);
                    selectCourses.push($(ui.selected.__data__)[0]);
                    updatePointsLayer(selectCourses);

                    $(ui.selected).addClass("prevCourse");
                }
            },
            unselected: function(event, ui) {
                var course = $(ui.unselected.__data__)[0];
                courseCount[course.className]--;
                if (ui.unselected.tagName == "LI") {
                    selectCourses = selectCourses.filter(function(c) {
                        return c.className !== course.className;
                    });
                    courseCount[course.className]--;
                    for (var arch in course.architects) {
                        archCount[course.architects[arch].className]--;
                        if (archCount[course.architects[arch].className] == 0) {
                            //unselect arch from archList
                            d3.selectAll(".architect-" + course.architects[arch].className).classed("ui-selected",false);
                        }
                    }
                    updatePointsLayer(selectCourses);
                    $(ui.unselected).removeClass("prevCourse");
                }
            }
        });
        $(".architectList").selectable({
            selected: function(event,ui) {
                // checks to see if there is a course class in any element
                // occurs when the previous selection was on a course
                var archName = $(ui.selected.__data__)[0].className;
                if (d3.selectAll('.prevCourse')[0].length != 0) {
                    selectCourses = [];
                    courseCount = {};
                    archCount = {};
                }
                if (ui.selected.tagName == "LI" && archCount[archName] != 1) {
                    if (archCount.hasOwnProperty(archName)) {
                        archCount[archName]++;
                    } else {
                        archCount[archName] = 1;
                    }
                    updateArchitectLegend(architectMap[archName]);
                    var courses = architectMap[$(ui.selected.__data__)[0].className].courses;

                    for (var i in courses) {
                        if (selectCourses.indexOf(courses[i]) === -1 && courses[i].rankings.hasOwnProperty(currentRanking)) {
                            if (courseCount.hasOwnProperty(courses[i].className)) {
                                courseCount[courses[i].className]++;
                            } else {
                                courseCount[courses[i].className] = 1;
                            }
                            selectCourses.push(courses[i]);
                            d3.selectAll(".course-" + courses[i].className).classed("ui-selectee", true).classed('ui-selected',true).classed('prevArch', true);
                        }
                    }
                    updatePointsLayer(selectCourses);

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
                    updatePointsLayer(selectCourses);
                    $(ui.unselected).removeClass("prevArch");
                }
            }
        })
}




/////////////////////////////////////////////
/////////// Mapping Functions ///////////////
/////////////////////////////////////////////

// Creates map and adds layers
function makeSomeMaps() {


    map = d3.carto.map();
//.tileType("stamen")
//        .path("terrain")
    d3.select("#map").call(map);
    map.centerOn([-99, 39], "latlong");
    map.setScale(4);
    map.refresh();
    wcLayer = d3.carto.layer.tile();
    wcLayer
        .tileType("mapbox")
        .path("elijahmeeks.map-azn21pbi")
        .label("Watercolor")
        .visibility(true);
    map.addCartoLayer(wcLayer);
    annotG = d3.select("#d3MapSVG").append('g');


    $("#d3MapZoomBox").remove();
    $("#d3MapLayerBox").remove();
    $("#d3MapPanBox").remove();

    d3.select("#map").on("mousedown", function(d) {
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
    coursePoints = d3.carto.layer.xyArray();
    var selectCourses = filterCourses();
    coursePoints
        .features(selectCourses)
        .label("courses")
        .cssClass("metro")
        .renderMode("svg")
        .markerSize(6)
        .markerColor("blue")
        .clickableFeatures(true)
        .x("x")
        .y("y");
    map.addCartoLayer(coursePoints);
    d3.selectAll(".pointG").style("fill", function(c) {
            if (c.type === "private") {
                return "blue"
            } else {
                return "red"
            }
        })
        .attr('class', function(d) {
            return 'pointG ' + d.className + "_point"
        })
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("background-color", 'lightgray');
            tooltip.html(d.displayName + "<br/> " + d.yearCreated[0]
                    + ", " + d.architects[0].displayName + "<br/>")
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on('click', function(d) {
            updateChart(d);
        });
    mapCourses = d3.selectAll('.pointG');
}
// Function to start zoom
function zoomStart() {
    rubberBand = {'start':{'x':d3.event.x, 'y':d3.event.y}};
    d3.event.stopPropagation();
}
// function to update bounding box on zoom move
function zoomMove() {
    if (rubberBand) {
        rubberBand.end = {'x':d3.event.x,'y':d3.event.y};

        var rb = annotG.selectAll('.rubberband')
            .data([rubberBand]);

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
        mapCourses.each(function(c){
            var w = Math.min(rubberBand.start.x, rubberBand.end.x),
                e = Math.max(rubberBand.start.x, rubberBand.end.x),
                n = Math.min(rubberBand.start.y, rubberBand.end.y),
                s = Math.max(rubberBand.start.y, rubberBand.end.y);
            var cr = this.getBoundingClientRect();
            if(cr.right >= w && cr.left <= e && cr.top <= s && cr.bottom >= n) {
                selectedCourses.push(this.__data__);
            }
        });

        updatePointsLayer(selectedCourses);
        updateCourses(selectedCourses);
        updateArchitects(selectedCourses);
        refocusMap(selectedCourses);
        rubberBand = null;
    }
}


function refocusMap(selectedCourses) {
    // first, find midpoint of courses
    var xMean = 0;
    var yMean = 0;

        for (var course in selectedCourses) {

            xMean  = xMean + parseFloat(selectedCourses[course].x);
            yMean  = yMean + parseFloat(selectedCourses[course].y);
    }

    xMean = xMean / selectedCourses.length;
    yMean = yMean /  selectedCourses.length;

    map.centerOn([xMean,yMean], 'latlong',2000);

}

function zoomUp() {
    endRubberBand();

}

// courses: array of courses to be plotted on the map
function updatePointsLayer(cs) {
    coursePoints.features(cs);
    map.refreshCartoLayer(coursePoints);
    d3.selectAll(".pointG")
        .style("fill", function(c) {
            if (c.type === "private") {
                return "blue"
            } else {
                return "red"
            }
        })
        .attr('class', function(d) {
            return 'pointG ' + d.className + "_point"
        })
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("background-color", 'lightgray');
            tooltip.html(d.displayName + "<br/> " + d.yearCreated[0]
                    + ", " + d.architects[0].displayName + "<br/>")
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on('click', function(d) {
            updateChart(d);
        });
}




////////////////////////////////////////
///////// Listener functions ///////////
////////////////////////////////////////
function handleClick(cb) {
    // true or false
    // public or private
    var courses = filterCourses();
    updatePointsLayer(courses);
    d3.selectAll(".pointG").style("fill", function(c) {
        if (c.type === "private") {
            return "blue"
        } else {
            return "red"
        }
    });
}

function updateCoursesFilter() {
    var courses = filterCourses();
    updatePointsLayer(courses);
    d3.selectAll(".pointG").style("fill", function(c) {
        if (c.type === "private") {
            return "blue"
        } else {
            return "red"
        }
    });
}

////////////////////////////////////////
////////// Helper Functions ////////////
////////////////////////////////////////


// Returns list of filtered courses
// filteres based:
// year slider
// private, public, or all
// if there are selected courses or architects
function filterCourses() {
    filteredCourses = rankingsMap[currentRanking].courses.filter(function(d) {
        return $("#slider").slider("option","value") > d.yearCreated[0];
    });
    return filteredCourses;
}



//// Global charting variable
var margin = {top: 30, right: 20, bottom: 10, left: 20},
    width = 300 - margin.left - margin.right,
    chartHeight = 600 - margin.top - margin.bottom;
var xScale;
var yScale;

var lineGen = d3.svg.line()
    .x(function(d) {
        return xScale(parseInt(d.year));
    })
    .y(function(d) {
        return yScale(d.rank);
    });


function createChart() {

    //// Global charting variable
    var margin = {top: 10, right: 20, bottom: 15, left: 20},
        width = 300 - margin.left - margin.right,
        chartHeight =  $(window).height() * 0.65 - margin.top - margin.bottom;

    xScale = d3.scale.linear().range([margin.left, width - margin.right]).domain([2000,2016]);
    yScale = d3.scale.linear().range([chartHeight - margin.top, margin.bottom]).domain([103,-1]);
    var lineGen = d3.svg.line()
        .x(function(d) {
            return xScale(parseInt(d.year));
        })
        .y(function(d) {
            return yScale(d.rank);
        });
    // if chart already exists, delete it
    $("#chart").empty();
    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([1, chartHeight]);
    x.domain([2000,2016]);
    y.domain([-1, -103]);
    var xAxis = d3.svg.axis().scale(xScale)
        .orient("bottom").tickValues([2001,2006,2011,2016])
        .tickFormat(d3.format(".0f"));

    var yAxis = d3.svg.axis().scale(yScale)
        .orient("left").tickValues([1,10,20,30,40,50,60,70,80,90, 100]);

    var valueline = d3.svg.line()
        .x(function(d) { return x(parseInt(d.year)); })
        .y(function(d) { return y(d.rank); });
    // Adds the svg canvas
    var svg = d3.select("#chart")
        .append("svg")
        .attr("class", "chart")
        .attr("id", "chartSVG")
        .attr("width", width + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + 0 + ")");
    svg.append("svg:g")
        .attr("transform", "translate(0," + (chartHeight - margin.bottom +5) + ")")
        .call(xAxis);

    svg.append("svg:g")
        .attr("transform", "translate(" + (margin.left) + ",0)")
        .call(yAxis);
    $(".legend").remove();

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

function updateDropdownOptions(type) {
    // figure out what has already been selected
    // figure out what selections to filter
    // type is the parameter that was just changed

    // if only one option selected, then this is first selection and need to assign selectable rankings
    var selectedOptions = 0;

    if ($("#publicationButton").text() === "publication") {selectedOptions++}
    if ($("#typeButton").text() === "type") {selectedOptions++}
    if ($("#yearButton").text() === "year") {selectedOptions++}

    if (selectedOptions == 2) {selectableRankings = Object.keys(rankingsMap).filter(function(a) {return a !== "all";});}

    if (type === "publication") {
        var publication = pubClassNames[$("#publicationButton").text()];
        selectableRankings = selectableRankings.filter(function(a) {return a.indexOf(publication) !== -1;});
    } else if (type === "type") {
        var type = $("#typeButton").text();
        selectableRankings = selectableRankings.filter(function(a) {return a.indexOf(type) !== -1;})
    } else if (type === "year") {
        var year = $("#yearButton").text();
        selectableRankings = selectableRankings.filter(function(a) {return a.indexOf(year) !== -1;})
    }
    var types = [];
    var years = [];
    var publications = [];
    for (var ranking in selectableRankings) {
        var year = selectableRankings[ranking].split("_")[1];
        var type = selectableRankings[ranking].split("_")[2];
        var publication = selectableRankings[ranking].split("_")[0];
        if (types.indexOf(type) === -1) {
            types.push(type);
        }
        if (years.indexOf(year) === -1) {
            years.push(year);
        }
        if (publications.indexOf(publication) === -1) {
            publications.push(publication);
        }
    }
    // empty and update picklists
    $("#typeUl").empty();
    $("#yearUl").empty();
    $("#publicationUl").empty();

    // update publication picklist
    var publicationSelect = document.getElementById('publicationUl');
    publications.forEach(function(publication) {
        var liWrapper = document.createElement("li");
        var opt = document.createElement('a');
        opt.value = publication;
        opt.href = "#";
        opt.innerHTML = pubDisplayNames[publication];
        liWrapper.appendChild(opt);
        publicationSelect.appendChild(liWrapper);
    });

    // update type picklist
    var typeSelect = document.getElementById('typeUl');
    types.forEach(function(type) {
        var liWrapper = document.createElement("li");
        var opt = document.createElement('a');
        opt.value = type;
        opt.href = "#";
        opt.innerHTML = type;
        liWrapper.appendChild(opt);
        typeSelect.appendChild(liWrapper);
    });

    // update type picklist
    var yearSelect = document.getElementById('yearUl');
    years.forEach(function(year) {
        var liWrapper = document.createElement("li");
        var opt = document.createElement('a');
        opt.value = year;
        opt.href = "#";
        opt.innerHTML = year;
        liWrapper.appendChild(opt);
        yearSelect.appendChild(liWrapper);
    });

    // bind click listener for new elements
    $("#publicationUl a").on("click",function() {
        $("#publicationButton").html(this.text);
        updateDropdownOptions("publication");
    });

    $("#typeUl a").on("click",function() {
        $("#typeButton").html(this.text);
        updateDropdownOptions("type");
    });

    $("#yearUl a").on("click",function() {
        $("#yearButton").html(this.text);
        updateDropdownOptions("year");
    });

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


function updateArchitectLegend(architect) {

    $(".legend-rankings-ul").empty();
    d3.select(".legend-left-header")
        .text("Architect Information");
    d3.select(".legend-h1")
        .text(architect.displayName);
    d3.select(".legend-h2")
        .text("Courses: " + architect.count);
    d3.select(".legend-h3")
        .text("newest: " + courseMap[architect.newestCourse.className].displayName + " " + architect.newestCourse.year);
    d3.select(".legend-h4")
        .text("oldest:" + courseMap[architect.oldestCourse.className].displayName + " " + architect.oldestCourse.year);
    d3.select(".legend-right-ul-header")
        .text("Top Courses:");
    var legendCoursesSelect = d3.select(".legend-rankings-ul").selectAll(".ranking")
        .data(architect.topCourses);
    var legendCoursesEnter = legendCoursesSelect.enter().append("li")
        .attr('class', function(d) {
            return "legendRanking ranking-" + d.className;
        });
    legendCoursesEnter.append('span')
        .text(function(a) {
            return a.displayName;
        })
        .style("color", function(a) {return lineColors[a.className]});
    // all ranking
    legendCoursesEnter.append('span')
        .text(function(a) {
            if (a.allRecentRanking != -1) {
                return a.allRecentRanking;
            } else {
                return "";
            }
        })
        .style("color", "blue")
        .style("margin-left","5px");
    // public ranking
    legendCoursesEnter.append('span')
        .text(function(a) {
            if (a.publicRecentRanking != -1) {
                return a.publicRecentRanking;
            } else {
                return "";
            }
        })
        .style("color", "red")
        .style("margin-left","5px");
}


function updateChart(course) {

    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    $(".legend-rankings-ul").empty();


    // if more than one course is selected, dont show chart
    if (d3.selectAll(".courseList > li.ui-selected")[0].length > 1) {
        clearChart();
        clearLegend();
        return
    }


    d3.selectAll(".chart > g svg").remove();
    var chartData = chartRankingData[course.className].rankings;
    var containerData = [];
    for (var key in chartData) {
        chartData[key].ranks.sort(function(a,b) {
            if (a.year < b.year) return -1;
            if (a.year > b.year) return 1;
        });

        chartData[key]['type'] = chartData[key]['className'].split("_")[1];

        containerData.push(chartData[key]);
    }
    var svg = d3.select(".chart > g")
        .append('svg');
    var pathContainers = svg.selectAll('g.line')
        .data(containerData);

    pathContainers.enter()
        .append('g')
        .attr('class', 'line')
        .attr("style", function(d) {
            return "stroke: " +
                    lineColors[d.className]
        });

    pathContainers.selectAll('path')
        .data(function(d) {return [d];})
        .enter().append('path')
        .attr('d',function(d) {return lineGen(d.ranks)})
        .on('mouseover', function(d) {
            d3.event.stopPropagation();

        });


    pathContainers.selectAll('circle')
        .data(function(d) {return d.ranks;})
        .enter().append('circle')
        .attr('cx', function(d) {return xScale(d.year); })
        .attr('cy', function(d) {return yScale(d.rank); })
        .style('fill', function(d) {return  lineColors[d.className]})
        .attr('r', 3);
    updateCourseLegend(containerData, course);


}


function architectsToString(myArr) {
    var returnStr = "";
    for (var i in myArr) {
        if (i != 0) {
            returnStr += ", ";
        }
        returnStr += myArr[i].displayName;
    }
    return returnStr;
}


function createClassName(cls) {
    return cls.trim().replace(/\(|\)|\{|\}|\&|\.|\"|\'/g,'').replace(/\s|\-/g,'_').toLowerCase();
}

var contains = function(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                var item = this[i];

                if((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle) > -1;
};



function loadAllCourses() {
    $('.ui-selected').removeClass('ui-selected').addClass('ui-unselecting');
    //$('.course').addClass("ui-selectee");
    //$('.courseList').data('ui-selectable')._mouseStop(null);
    currentRanking = 'all';
    var courses = filterCourses();
    updateCourses(courses);
    updateArchitects(courses);
    updatePointsLayer(courses);
    $('#rankingHeader').html("All Courses");
    $('#mapTitle').html("All Courses");
    $('.infoH').text("");
    $('.courseInfoHeader').text();
    $('.legendRanking').remove();
}



function showSelectRankingControl() {
    $("#showAllButton").css("display", "");
    $("#pickRankingButton").css("display","none");
    $("#specificRankingDiv").css("display","");
    $("#allCoursesDiv").css("display","none");
}

// Function that highlights course on map when selected
function modalSelect(course) {
    updateChart(course);
}

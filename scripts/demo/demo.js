/**
 * Demo Class
 */
var Demo = function() {
    var WELCOME_STEP = 0;
    var CREATION_STEP = 1;
    var GROUPING_STEP = 2;
    var GRAHAM_SCAN_STEP = 3;
    var JARVIS_MARCH_STEP = 4;
    var COMPLETED_HULL_STEP = 5;

    var lastStep = 5;
    var step = 0;
    var animating = false;
    var config;
    var graphics;
    init();

    /**
     * Acts as a constructor for the Demo class
     */
    function init() {
        graphics = new Graphics("#graphics");
        resetConfig();
        setFocus();
        updateDemoText();
    }

    /**
     * Resets the instatance fields to replay the demo
     */
    function restartDemo() {
        swal({
                title: "Really?",
                text: "This will restart the demo",
                showCancelButton: true,
                confirmButtonText: "Yes, restart",
            },
            function() {
                graphics.clearAll();
                resetConfig();
                $("#graphics").off("click");
                unbind("p");
                step = 0;
                updateDemoText();
            }
        );
    }

    /**
     * Sets the initial demo configuration values
     */
    function resetConfig() {
        config = {
            m: 5,
            points: [],
            groups: [],
            groupHulls: [],
            groupHullLines: []
        }
    }

    /**
     * Toggles the animating flag to signal whether graphics are animating
     */
    function toggleAnimating() {
        if (animating) {
            $(".nav-button").removeClass("disabled");
        }
        else {
            $(".nav-button").addClass("disabled");
        }
        animating = !animating;
    }

    /**
     * Updates the explanation on the screen associated with a step in the demo
     */
    function updateDemoText() {
        $(".explanation-section").fadeOut(100).promise().done(function() {
            $(".explanation-section[data-step='" + step + "']").fadeIn(500);
        });

        // $("#explanation-" + step).show();
        $("#step").html(step);
    }

    /**
     * Replays a step in the demo
     */
    function replayStep() {
        swal("Unimplemented", "Sorry, not done yet");
    }

    /**
     * Moves to the next step in the demo
     */
    function nextStep() {
        function moveOn(stepRunner) {
            step++;
            updateDemoText();
            stepRunner();
        }

        if (step == WELCOME_STEP)
            moveOn(runCreationStep);
        else if (step == CREATION_STEP)
            endCreationStep(function() { moveOn(runGroupingStep) });
        else if (step == GROUPING_STEP)
            moveOn(runGrahamScanStep);
        else if (step == GRAHAM_SCAN_STEP)
            moveOn(runJarvisMarchStep);
        else if (step == JARVIS_MARCH_STEP)
            moveOn(runCompletedHullStep);
        else if (step == COMPLETED_HULL_STEP)
            swal("Unimplemented", "Sorry, not done yet");
    }

    /**
     * Runs the point creation step
     */
    function runCreationStep() {
        function drawRandomPoint() {
            function crand(min, max, bias, influence) {
                var rnd = Math.random() * (max - min) + min;
                var mix = Math.random() * influence;
                return rnd * (1 - mix) + bias * mix;
            }
            var width = graphics.getWidth();
            var height = graphics.getHeight();
            var influence = .7;
            var xBias = width / 2, yBias = height / 2;
            var xMin = width * .05, xMax = width - xMin;
            var yMin = height * .05, yMax = height - yMin;
            var x = crand(xMin, xMax, xBias, influence)
            var y = crand(yMin, yMax, yBias, influence)
            return graphics.putPoint(x, y);
        }

        graphics.setColor("#AAA");
        graphics.setTransition(250);

        $("#graphics").on("click", function() {
            var point = graphics.putPoint(event.offsetX, event.offsetY);
            config.points.push(point);
        });

        hotkeys("p", function(event, handler) {
            var point = drawRandomPoint();
            config.points.push(point);
        });
    }

    /**
     * Runs after the creation step is complete to see if there are enough points
     */
    function endCreationStep(success) {
        if (config.points.length < 10)
            swal("Wait!", "Please add more points before continuing");
        else {
            $("#graphics").off("click");
            unbind("p");
            success();
            console.log(config);
        }
    }

    /**
     * Runs the point grouping step
     */
    function runGroupingStep() {
        var groupColors = ["#1abc9c", "#3498db", "#9b59b6", "#2ecc71",
                            "#f1c40f", "#e67e22", "#e74c3c", "#ecf0f1",
                            "#16a085", "#27ae60", "#2980b9", "#8e44ad",
                            "#f39c12", "#d35400","#c0392b", "#bdc3c7"];

        toggleAnimating();
        var currentGroup = [];
        config.points.forEach(function(point) {
            var groupID = config.groups.length;
            var pointColor = groupColors[groupID % groupColors.length];
            graphics.setColor(pointColor);
            graphics.setTransition(0);
            if (currentGroup.length == config.m - 1)
                graphics.setDelay(300);
            else
                graphics.setDelay(0);
            graphics.erasePoint(point);
            graphics.setDelay(0);
            graphics.setTransition(0);
            var x = point.attr("cx");
            var y = point.attr("cy");
            var coloredPoint = graphics.drawPoint(x, y);
            currentGroup.push(coloredPoint);
            if (currentGroup.length == config.m) {
                config.groups.push(currentGroup);
                currentGroup = [];
            }
        });
        graphics.whenDone(toggleAnimating);
    }

    /**
     * Returns 1 for a left turn, -1 for right, and 0 for straight
     */
    function turn(p1, p2, p3) {
        var x1 = p1.attr("cx"), x2 = p2.attr("cx"), x3 = p3.attr("cx");
        var y1 = p1.attr("cy"), y2 = p2.attr("cy"), y3 = p3.attr("cy");
        var v = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
        if (v > 0) return -1;
        else if (v < 0) return 1;
        else return 0;
    }

    /**
     * Returns the square of the distance between two D3 points
     */
    function sqDist(p1, p2) {
        var x1 = p1.attr("cx"), x2 = p2.attr("cx");
        var y1 = p1.attr("cy"), y2 = p2.attr("cy");
        return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    }

    /**
     * Runs the Graham Scan step
     */
    function runGrahamScanStep() {
        toggleAnimating();

        // Make copy groups of points
        var newGroups = config.groups.map(function(group) {
            return group.slice();
        });

        // Run Graham Scan on each group
        newGroups.forEach(function(group) {
            //Find the point with minimum x value
            var groupXSorted = group.sort(function(p1, p2) {
                return p1.attr("cx") > p2.attr("cx") ? 1 : -1;
            });
            var minPoint = groupXSorted.shift();

            // Sort all points radially from the minimum x point
            var groupPolarSorted = groupXSorted.sort(function(p1, p2) {
                var turnVal = turn(minPoint, p1, p2);
                if (turnVal == 0)
                    return sqDist(minPoint, p1) > sqDist(minPoint, p2) ? 1 : -1;
                else
                    return turnVal;
            });

            var groupColor = minPoint.attr("fill");
            graphics.setColor(groupColor);
            graphics.setTransition(250);

            var lineStack = [];
            var pointStack = [];
            pointStack.push(minPoint);
            var firstPolarSorted = groupPolarSorted.pop();
            pointStack.push(firstPolarSorted);
            var firstLine = graphics.drawLineFromPoints(minPoint, firstPolarSorted);
            lineStack.push(firstLine);

            // Wrap around the group to find the convex hull
            groupPolarSorted.forEach(function(point) {
                var turnVal = -1;
                while (turnVal < 0 && pointStack.length >= 2) {
                    var p1 = pointStack[pointStack.length - 2];
                    var p2 = pointStack[pointStack.length - 1];
                    turnVal = turn(p1, p2, point);
                    if (turnVal < 0) {
                        pointStack.pop();
                        var line = lineStack.pop();
                        // graphics.eraseLine(line);
                    }
                }
                pointStack.push(point);

            });

            config.groupHulls.push(pointStack);
            config.groupHullLines.push(lineStack);
        });

        graphics.whenDone(toggleAnimating);



        // function grahamScanGroups(groups) {
        //     var group = groups.pop();
        //
        //     // Find the point with minimum x value
        //     var groupXSorted = group.sort(function(p1, p2) {
        //         return p1.attr("cx") > p2.attr("cx") ? 1 : -1;
        //     });
        //     var minPoint = groupXSorted.shift();
        //
        //     // Sort all points radially from the minimum x point
        //     var groupPolarSorted = groupXSorted.sort(function(p1, p2) {
        //         var turnVal = turn(minPoint, p1, p2);
        //         if (turnVal == 0)
        //             return sqDist(minPoint, p1) > sqDist(minPoint, p2) ? 1 : -1;
        //         else
        //             return turnVal;
        //     });
        //
        //     var groupColor = minPoint.attr("fill");
        //     graphics.setColor(groupColor);
        //     graphics.setTransition(250);
        //
        //     function scanGroup(group) {
        //
        //         if (group.length == 0) {
        //             config.groupHulls.push(pointStack);
        //             if (groups.length > 0)
        //                 grahamScanGroups(groups);
        //             else
        //                 toggleAnimating();
        //         }
        //         else {
        //             var didRemovePoint = false;
        //             var promise;
        //             if (pointStack.length >= 3) {
        //                 var p3 = pointStack.pop();
        //                 var p2 = pointStack.pop();
        //                 var p1 = pointStack.pop();
        //                 var turnVal = turn(p1, p2, p3);
        //                 if (turnVal < 0) {
        //                     var line1 = lineStack.pop();
        //                     var line2 = lineStack.pop();
        //                     promise = graphics.removeLine(line1);
        //                     promise = graphics.removeLine(line2);
        //                     pointStack.push(p1);
        //                     group.push(p3);
        //                 }
        //                 else {
        //                     pointStack.push(p1);
        //                     pointStack.push(p2);
        //                     pointStack.push(p3);
        //                 }
        //             }
        //
        //             if (!didRemovePoint) {
        //                 var stackTopPoint = pointStack[pointStack.length - 1];
        //                 var nextPoint = group.pop();
        //                 var x1 = stackTopPoint.attr("cx"), y1 = stackTopPoint.attr("cy");
        //                 var x2 = nextPoint.attr("cx"), y2 = nextPoint.attr("cy");
        //
        //                 var toAdd = graphics.drawLine(x1, y1, x2, y2);
        //                 lineStack.push(toAdd.line);
        //                 pointStack.push(nextPoint);
        //                 promise = toAdd.promise;
        //             }
        //
        //             promise.then(function() {
        //                 scanGroup(group);
        //             });
        //         }
        //     }
        //
        //     var lineStack = [];
        //     var pointStack = [];
        //     pointStack.push(minPoint);
        //     if (groupPolarSorted.length == 0) {
        //         config.groupHulls.push(groupHull);
        //         if (groups.length > 0)
        //             grahamScanGroups(groups);
        //         else
        //             toggleAnimating();
        //     }
        //     else
        //         scanGroup(groupPolarSorted);
        //
        //     /*
        //         TODO: Do not use radial lines
        //         Just show the current convex hull as dictated by the stack
        //         Do each group convex hull on its own
        //         This way only one line is drawn at a time
        //
        //         Current issue is that finalPromise is used when the loop doesn't run b/c group of 1 pt
        //     */
        //
        //     // var finalPromise;
        //     // groupPolarSorted.forEach(function(point) {
        //     //     var groupColor = minPoint.attr("fill");
        //     //     graphics.setColor(groupColor);
        //     //     graphics.setTransition(400);
        //     //     var xA = minPoint.attr("cx");
        //     //     var yA = minPoint.attr("cy");
        //     //     var xB = point.attr("cx");
        //     //     var yB = point.attr("cy");
        //     //
        //     //     var toAdd = graphics.drawLine(xA, yA, xB, yB);
        //     //     radialLines.push({
        //     //         point: point,
        //     //         line: toAdd.line
        //     //     });
        //     //     finalPromise = toAdd.promise;
        //     // });
        //
        //     // finalPromise.then(function() {
        //     //     if (groups.length > 0)
        //     //         grahamScanGroups(groups);
        //     //     else
        //     //         toggleAnimating();
        //     // });
        // }
        // toggleAnimating();
        // var newGroups = config.groups.map(function(group) {
        //     return group.slice();
        // });
        // grahamScanGroups(newGroups);
    }

    /**
     * Runs the Jarvis March step
     */
    function runJarvisMarchStep() {

    }

    /**
     * Runs the step that completes the convex hull with Jarvis March
     */
    function runCompletedHullStep() {

    }

    /**
     * Adds key and mouse listeners to the screen
     */
    function setFocus() {
        hotkeys("space,r", function(event, handler) { onKeyPress(handler.key); });
        $("#restart-button").on("click", function() { onButtonPress("restart"); });
        $("#replay-button").on("click", function() { onButtonPress("replay"); });
        $("#next-button").on("click", function() { onButtonPress("next"); });
    }

    /**
     * Handles key press events
     */
    function onKeyPress(key) {
        if (!animating) {
            if (key == "space")
                nextStep();
            else if (key == "r")
                restartDemo();
        }
    }

    /**
     * Handles button press events
     */
    function onButtonPress(button) {
        if (!animating) {
            if (button == "restart")
                restartDemo();
            else if (button == "replay")
                replayStep();
            else if (button == "next")
                nextStep();
        }
    }
}

// Creates a new demo and runs it
var demo = new Demo();

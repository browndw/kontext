(function (context) {
    'use strict';

    var createTagLoader,
        attachTagLoader;


    /**
     * @param selector
     * @param status boolean
     */
    function switchSelectorStatus(selector, status) {
        var siblings = selector.parentNode.siblings(),
            tableCell = null;

        if (siblings.length === 1 && siblings[0].readAttribute('class') === 'num') {
            tableCell = siblings[0];
        }

        if (status === true) {
            selector.writeAttribute('disabled', null);
            siblings[0].setStyle({ color : '#000' });

        } else if (status === false) {
            selector.writeAttribute('disabled', 'disabled');
            siblings[0].setStyle({ color : '#AAA' });
        }
    }

    /**
     * Creates new AJAX tag hint loader for selected corpus
     *
     * @param corpusName corpus identifier
     * @param numTagPos
     * @param hiddenElm ID or element itself
     * @param multiSelectComponent
     * @return {Object}
     */
    createTagLoader = function (corpusName, numTagPos, hiddenElm, multiSelectComponent) {

        var tagLoader,
            i;

        /**
         * Tag data loading service object
         *
         * @type {Object}
         */
        tagLoader = {

            /**
             * Holds a corpus name for which this object is configured.
             */
            corpusName : corpusName,

            /**
             *
             */
            numTagPos : numTagPos,

            /**
             *
             */
            hiddenElm : hiddenElm,

            /**
             *
             */
            multiSelectComponent : multiSelectComponent,

            /**
             * Latest tag pattern (e.g. PKM-4--2--------) used by this loader
             */
            lastPattern : '',

            /**
             * Initial values for all tag positions used by this tag loader (always the same for a specific corpus)
             */
            initialValues : null,

            /**
             *
             */
            selectedValues : [],

            /**
             * List of patterns user gradually created
             */
            history : [],

            /**
             * Encodes multi-select element-based form into a tag string (like 'NNT1h22' etc.)
             *
             * @param anyCharSymbol
             */
            encodeFormStatus : function (anyCharSymbol) {
                var data,
                    ans = '',
                    prop,
                    positionCode,
                    i;

                anyCharSymbol = anyCharSymbol || '-';
                data = tagLoader.multiSelectComponent.exportStatus();

                for (prop in data) {
                    positionCode = [];
                    if (data.hasOwnProperty(prop)) {
                        for (i = 0; i < data[prop].length; i += 1) {
                            if (data[prop][i] !== null) {
                                positionCode.push(data[prop][i]);
                            }
                        }
                    }
                    if (positionCode.length > 1) {
                        ans += '(' + positionCode.join('|') + ')';

                    } else if (positionCode.length === 1) {
                        ans += positionCode[0];

                    } else {
                        ans += '-';
                    }
                }

                if (anyCharSymbol !== '-') {
                    ans = ans.replace(/-/g, anyCharSymbol);
                }
                if (anyCharSymbol === '.') {
                    ans = ans.replace(/([^.]?)(\.)+$/, '$1.*');
                }
                console.log('ans: ' + ans);
                return ans;
            },

            /**
             * Returns number of SELECT elements from a provided list with values other than empty or '-'
             *
             * @param elmList list of SELECT elements
             * @return number
             */
            getNumberOfSelectedItems : function (elmList) {
                var i,
                    ans = 0;

                for (i = 0; i < elmList.length; i += 1) {
                    if (elmList[i].getValue() && elmList[i].getValue() !== '-') {
                        ans += 1;
                    }
                }
                return ans;
            },


            /**
             * Updates all SELECT element-based form items with provided data
             *
             * @param activeNode active SELECT element
             * @param data data to be used to update form (array (each SELECT one item) of arrays (each OPTION one possible
             * tag position value) of arrays (0 - value, 1 - label))
             */
            updateMultiSelectValues : function (activeNode, data) {
                var i,
                    j,
                    currValue,
                    newOption,
                    blockId;

                for (i = 0; i < data.length; i += 1) {
                    blockId = 'position_' + i;
                    tagLoader.multiSelectComponent.addBlock(blockId, 'position ' + (i + 1));
                    for (j = 0; j < data[i].length; j += 1) {
                        tagLoader.multiSelectComponent.addItem(blockId, data[i][j][0], data[i][j][1], function (event) {
                            var pattern;

                            pattern = tagLoader.encodeFormStatus();
                            //console.log('event: ' + pattern);
                            tagLoader.loadPatternVariants(pattern, function (data) {
                                console.log('response: ' + data);
                            });
                        });
                    }
                }


                for (i = 0; i < elmList.length; i += 1) {
                    if (!activeNode || activeNode.parentNode !== elmList[i]) {
                        currValue = elmList[i].getValue();
                        // TODO simplify if-elseif
                        if (data[i].length === 1) {
                            elmList[i].update();
                            switchSelectorStatus(elmList[i], false);
                            newOption = Element.extend(document.createElement('option'));
                            newOption.writeAttribute('value', data[i][0][0]);
                            newOption.insert(data[i][0][1]);
                            elmList[i].insert(newOption);
                            if (currValue === data[i][0][0]) {
                                elmList[i].selectedIndex = 0;
                            }

                        } else if (data[i].length > 1) {
                            switchSelectorStatus(elmList[i], true);
                            elmList[i].update();
                            for (j = 0; j < data[i].length; j += 1) {
                                newOption = Element.extend(document.createElement('option'));
                                newOption.writeAttribute('value', data[i][j][0]);
                                newOption.insert(data[i][j][1]);
                                elmList[i].insert(newOption);
                                if (currValue === data[i][j][0]) {
                                    elmList[i].selectedIndex = j + 1;
                                }
                            }

                        } else {
                            switchSelectorStatus(elmList[i], false);
                        }

                    } else {
                        activeNode.writeAttribute('selected', 'selected');
                    }
                }
            },

            /**
             * Updates options of a single SELECT element by provided data
             *
             * @param selectElement
             * @param data
             */
            updateSelectOptions : function (selectElement, data) {
                var i,
                    newElement;

                selectElement.update('');
                for (i = 0; i < data.length; i += 1) {
                    newElement = Element.extend(document.createElement('option'));
                    newElement.writeAttribute('value', data[i][0]);
                    newElement.insert(data[i][1]);
                    selectElement.insert(newElement);
                }
                selectElement.selectedIndex = 0;
            },

            /**
             * @param callback function to be called when variants are loaded, JSON data is passed as a parameter
             */
            loadInitialVariants : function (callback) {
                var url = 'ajax_get_tag_variants?corpname=' + tagLoader.corpusName,
                    params = {},
                    ajax;

                if (tagLoader.initialValues === null) {
                    ajax = new Ajax.Request(url, {
                        parameters : params,
                        method : 'get',
                        // requestHeaders: {Accept: 'application/json'},
                        onComplete : function (data) {
                            tagLoader.initialValues = data.responseText.evalJSON();
                            callback(tagLoader.initialValues);
                        }
                    });

                } else {
                    callback(tagLoader.initialValues);
                }
            },

            /**
             *
             * @param pattern
             * @param callback
             */
            loadPatternVariants : function (pattern, callback) {
                var url = 'ajax_get_tag_variants?corpname=' + tagLoader.corpusName + '&pattern=' + pattern,
                    params = {},
                    ajax;

                ajax = new Ajax.Request(url, {
                    parameters : params,
                    method : 'get',
                    // requestHeaders: {Accept: 'application/json'},
                    onComplete : function (data) {
                        callback(data.responseText.evalJSON());
                    }
                });
            },

            /**
             * @todo rewrite
             * @param event
             */
            resetButtonClick : function (event) {
                tagLoader.history = [];
                tagLoader.loadInitialVariants(function (data) {
                    var a;

                    tagLoader.updateMultiSelectValues(null, data);
                    for (a in tagLoader.selectedValues) {
                        if (tagLoader.selectedValues.hasOwnProperty(a)) {
                            tagLoader.selectedValues[a] = '-';
                        }
                    }
                    tagLoader.lastPattern = null;
                    selList.each(function (item, idx) {
                        item.selectedIndex = 0;
                    });
                    updateConcordanceQuery();
                });
            },

            /**
             * @todo rewrite
             * @param event
             */
            backButtonClick : function (event) {
                var prevPattern;

                tagLoader.history.pop(); // remove current value
                prevPattern = tagLoader.history[tagLoader.history.length - 1];

                if (prevPattern) {
                    tagLoader.loadPatternVariants(prevPattern, function (data) {
                        tagLoader.updateMultiSelectValues(null, data);
                        updateConcordanceQuery();
                    });

                } else { // empty => load initial values
                    tagLoader.loadInitialVariants(function (data) {
                        var a;

                        tagLoader.updateMultiSelectValues(null, data);
                        for (a in tagLoader.selectedValues) {
                            if (tagLoader.selectedValues.hasOwnProperty(a)) {
                                tagLoader.selectedValues[a] = '-';
                            }
                        }
                        tagLoader.lastPattern = null;
                        selList.each(function (item, idx) {
                            item.selectedIndex = 0;
                        });
                        updateConcordanceQuery();
                    });
                }
            }
        };


        tagLoader.corpusName = corpusName;
        tagLoader.hiddenElm = hiddenElm;
        for (i = 0; i < numTagPos; i += 1) {
            tagLoader.selectedValues[i] = '-';
        }
        return tagLoader;
    };

    /**
     * A helper method that does whole 'create a tag loader for me' job.
     *
     * @param corpusName identifier of a corpus to be used along with this tag loader
     * @param numOfPos number of positions in the tag string
     * @param multiSelectComponent
     * @param opt a dictionary with following keys:
     *     resetButton    : ID or element itself for the "reset" button
     *     backButton     : ID or element itself for the "back" button
     *     tagDisplay     : ID or element itself for the "tag display" box
     *     hiddenElm      : ID or element itself
     * @return {tagLoader}
     */
    context.attachTagLoader = function (corpusName, numOfPos, multiSelectComponent, opt) {
        var tagLoader,
            selList,
            hiddenElm,
            updateConcordanceQuery;

        if (typeof (opt.tagDisplay) === 'string') {
            opt.tagDisplay = $(opt.tagDisplay);
        }

        updateConcordanceQuery = function () {
            var pattern = tagLoader.encodeFormStatus('.');
            if (opt.tagDisplay) {
                opt.tagDisplay.update(pattern);
            }
            tagLoader.lastPattern = pattern;
            if (tagLoader.hiddenElm) {
                tagLoader.hiddenElm.setValue(pattern);
            }
        };
        numOfPos = numOfPos || 4; // TODO
        if (typeof (opt.hiddenElm) === 'string') {
            hiddenElm = $(opt.hiddenElm);
        }
        tagLoader = createTagLoader(corpusName, numOfPos, hiddenElm, multiSelectComponent);
        tagLoader.loadInitialVariants(function (data) {
            tagLoader.updateMultiSelectValues(null, data);
        });
        if (typeof (opt.resetButton) === 'string') {
            opt.resetButton = $(opt.resetButton);
        }
        if (opt.resetButton) {
            opt.resetButton.observe('click', tagLoader.resetButtonClick);
        }
        if (typeof (opt.backButton) === 'string') {
            opt.backButton = $(opt.backButton);
        }
        if (opt.backButton) {
            opt.backButton.observe('click', tagLoader.backButtonClick);
        }

/*
        selList.each(function (item, idx) {
            $('position-sel-' + idx).observe('click', function (event) {
                var currPattern,
                    eventSrcElement = normalizeSelectEventSource(event.element());

                if (eventSrcElement.getValue() !== tagLoader.selectedValues[idx]) {
                    tagLoader.selectedValues[idx] = eventSrcElement.getValue();

                    if (tagLoader.getNumberOfSelectedItems(selList) > 0) {
                        currPattern = tagLoader.encodeFormStatus(selList);
                        if (currPattern !== tagLoader.lastPattern) {
                            tagLoader.loadPatternVariants(currPattern, function (data) {
                                tagLoader.updateFormValues(selList, event.element(), data);
                                tagLoader.lastPattern = currPattern;
                                updateConcordanceQuery();
                                tagLoader.history.push(currPattern);
                            });
                        }
                        updateConcordanceQuery();

                    } else {
                        // different browsers here pass different nodes as an event source
                        tagLoader.loadInitialVariants(function (data) {
                            tagLoader.updateSelectOptions(eventSrcElement, data[idx]);
                        });
                    }

                } else {
                    // TODO is this necessary?
                    updateConcordanceQuery();
                }
            });
        });
*/
        updateConcordanceQuery();
        return tagLoader;
    };


}(window));
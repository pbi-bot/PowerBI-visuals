﻿/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
/// <reference path="../../_references.ts"/>

module powerbi.visuals.samples {
    import SelectionManager = utility.SelectionManager;
    export interface SunburstNode {
        children?: SunburstNode[];
        value?: any;
        color?: string;
        name?: string;
        parent?: SunburstNode;
        selector: SelectionId;
    }

    export interface SunburstViewModel {
        root: SunburstNode;
    }

    export class Sunburst implements IVisual {
        
        public static capabilities: VisualCapabilities = {
        };
        public static minOpacity = 0.2;
        private disableMouceOut: boolean = false;
        private svg: D3.Selection;
        private g: D3.Selection;
        private viewport: IViewport;
        private colors: IDataColorPalette;
        private selectionManager: SelectionManager;

        public init(options: VisualInitOptions): void {
            this.colors = options.style.colorPalette.dataColors;
            this.selectionManager = new SelectionManager({ hostServices: options.host });
            this.svg = d3.select(options.element.get(0)).append('svg');
            this.g = this.svg.append('g');
            this.svg.append("text")
                .attr("id", "percentage")
                .attr("y", "30px")
                .attr("x", "30px")
                .attr("opacity", "0")
                .style("font-weight", "bold")
                .text("");
            this.svg.append("text")
                .attr("id", "percentageFixed")
                .attr("y", "30px")
                .attr("x", "30px")
                .attr("opacity", "0")
                .style("font-weight", "bold")
                .text("");

            //Use info panel to debug events
            //this.svg.append("text")
            //    .attr("id", "infoPanel")
            //    .attr("y", "30px")
            //    .attr("x", "30px")
            //    .text("Info:");
        }

        public static getAllUnhide(selection) {
            selection.attr("setUnHide", "true");
        }
        public mousemove(d, i, this_) {
            console.log(d3.mouse(d));
        }
        public update(options: VisualUpdateOptions) {
            //let infoPanel = this.svg.select("#infoPanel");
            //infoPanel.text('Update');
            let data = Sunburst.converter(options.dataViews[0], this.colors);
            this.viewport = options.viewport;
            let svg_obj = this.svg;
            let this_ = this;
            svg_obj.attr({
                'id': 'mainDrawArea',
                'height': this.viewport.height,
                'width': this.viewport.width
            });

            svg_obj.on('click', (d) => {
                    svg_obj.selectAll("path").style("opacity", 1);
                    this.disableMouceOut = false;
                    this.svg.select("#percentageFixed").style("opacity", 0);
                    this.selectionManager.clear();
                });

            svg_obj.on("mousemove", function () {
                let point = d3.mouse(this)
                    , p = { x: point[0], y: point[1] };
                let shift = 20;
                let percentageText = svg_obj.select("#percentage");
                percentageText.attr("y", p.y + shift);
                percentageText.attr("x", p.x + shift);
            });

            this.g
                .attr("id", "container")
                .attr("transform", "translate(" + this.viewport.width / 2 + "," + this.viewport.height / 2 + ")");

            let radius = Math.min(this.viewport.width, this.viewport.height) / 2;

            let partition = d3.layout.partition()
                .sort(null)
                .size([2 * Math.PI, radius * radius])
                .value((d) => { return 1; });

            let path = this.g.datum(data).selectAll("path")
                .data(partition.nodes);
            path.enter().append("path");
            path
                .attr("display", (d) => { return d.depth ? null : "none"; })
                .attr("d", this.arc)
                .style("stroke", "#fff")
                .style("fill", (d) => { return d.color; })
                .style("fill-rule", "evenodd")
                .each(this.stash)
                .on("mouseover", (d) => { this.mouseover(d, this_, false); })
                .on("mouseleave", (d) => { this.mouseleave(d, this_); })
                .on("click", (d) => {

                    this.selectionManager.select(d.selector);
                    d3.selectAll("path").call(Sunburst.getAllUnhide).attr('setUnHide', null);
                    this.svg.select("#container").on("mouseleave", null);
                    this.mouseover(d, this, true);
                    this.disableMouceOut = true;

                    let percentageFixedText = this.svg.select("#percentageFixed");
                    percentageFixedText.text(d ? d.value + "%" : "");
                    percentageFixedText.style('fill', d.color);
                    this.onResize();
                    event.stopPropagation();
                });
            d3.select("#container")
                .on("mouseleave", (d) => { this.mouseleave(d, this_); });

            this.onResize();
        }

        public arc = d3.svg.arc()
            .startAngle(function (d) { return d.x; })
            .endAngle(function (d) { return d.x + d.dx; })
            .innerRadius(function (d) { return Math.sqrt(d.y); })
            .outerRadius(function (d) { return Math.sqrt(d.y + d.dy); });
        // Stash the old values for transition.
        public stash(d) {
            d.x0 = d.x;
            d.dx0 = d.dx;
        }

        // Interpolate the arcs in data space.
        public arcTween(a) {
            let i = d3.interpolate({ x: a.x0, dx: a.dx0 }, a);
            return (t) => {
                let b = i(t);
                a.x0 = b.x;
                a.dx0 = b.dx;
                return this.arc(b);
            };
        }
        // Get all parents of the node
        public static getParents(node) {
            let path = [];
            let current = node;
            while (current.parent) {
                path.unshift(current);
                current = current.parent;
            }
            return path;
        }

        public onResize() {
            let width = this.viewport.width;
            let height = this.viewport.height;
            let percentageText = this.svg.select("#percentage");
            let percentageFixedText = this.svg.select("#percentageFixed");
            let dXtextFixed = percentageText.text.length > 0 ? 10 : 0;
            percentageText.style("opacity", 1);
            percentageFixedText.style("opacity", 1);
            percentageFixedText.attr("y", (height / 2 + dXtextFixed));
            percentageFixedText.attr("x", ((width / 2) - (percentageFixedText.node().clientWidth / 2)));
        }

        public mouseover(d, svgObj, setUnhide) {
            let percentageText = svgObj.svg.select("#percentage");
            //let percentageValue = (100 * d.value / totalSize).toPrecision(3);
            percentageText.text(d ? d.value + "%" : "");

            svgObj.onResize();
            let parentsArray = d ? Sunburst.getParents(d) : [];
            // Set opacity for all the segments.
            svgObj.svg.selectAll("path").each(function () {
                if (d3.select(this).attr('setUnHide') !== 'true') {
                    d3.select(this).style("opacity", Sunburst.minOpacity);
                }
            });
            // Highlight only ancestors of the current segment.
            svgObj.svg.selectAll("path")
                .filter(function (node) {
                    return (parentsArray.indexOf(node) >= 0);
                }).each(function () {
                    d3.select(this).style("opacity", 1);
                    if (setUnhide === true) {
                        d3.select(this).attr('setUnHide', 'true');
                    }
                });
        }

        public mouseleave(d, svgObj) {

            if (!svgObj.disableMouceOut) {
                svgObj.svg.selectAll("path")
                    .style("opacity", 1);
                let percentageText = this.svg.select("#percentage");
                percentageText.style("opacity", 0);
            }
            else {
                svgObj.mouseover(null, svgObj);
            }

            //let infoPanel = svgObj.svg.select("#infoPanel");
            //infoPanel.text('mouseleave ' + svgObj.disableMouceOut);
        }

        public static covertTreeNodeToSunBurstNode(originParentNode: DataViewTreeNode, sunburstParentNode: SunburstNode, colors: IDataColorPalette): SunburstNode {
            let key = (originParentNode.children ? originParentNode : sunburstParentNode).name;
            window.console.log(key);
            let newSunNode: SunburstNode = {
                name: originParentNode.name,
                value: originParentNode.value,
                selector: SelectionId.createWithId(originParentNode.value),
                color: colors.getColorScaleByKey(':)').getColor(key).value
            };
            if (originParentNode.children && originParentNode.children.length > 0) {
                newSunNode.children = [];
                for (let i = 0; i < originParentNode.children.length; i++) {
                    newSunNode.children.push(
                        Sunburst.covertTreeNodeToSunBurstNode(originParentNode.children[i], newSunNode, colors)
                        );
                }
            }
            if (sunburstParentNode) {
                newSunNode.parent = sunburstParentNode;
            }

            return newSunNode;
        }

        public static converter(dataView: DataView, colors: IDataColorPalette): any {

            let root: SunburstNode = Sunburst.covertTreeNodeToSunBurstNode(dataView.tree.root, null, colors);

            return root;
        }

    }
}
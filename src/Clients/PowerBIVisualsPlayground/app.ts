/*
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

/// <reference path="_references.ts"/>

interface JQuery {
    /** Demonstrates how Power BI visual creation could be implemented as jQuery plugin */
    visual(plugin: Object, rendererName: string, dataView?: Object): JQuery;
}

module powerbi.visuals {
    
    import defaultVisualHostServices = powerbi.visuals.defaultVisualHostServices;

    import HostControls = powerbi.visuals.HostControls;

    /**
     * Demonstrates Power BI visualization elements and the way to embed them in standalone web page.
     */
    export class Playground {

        /** Represents sample data view used by visualization elements. */
        private static pluginService: IVisualPluginService = powerbi.visuals.visualPluginFactory.create();
        private static visualElement: IVisual;

        private static hostControls: HostControls;
        private static container: JQuery;

        //public static renderer: (e: JQuery) => powerbi.visuals.experimental.IVisualRenderer;

        private static visualStyle: IVisualStyle = {
            titleText: {
                color: { value: 'rgba(51,51,51,1)' }
            },
            subTitleText: {
                color: { value: 'rgba(145,145,145,1)' }
            },
            colorPalette: {
                dataColors: new powerbi.visuals.DataColorPalette(),
            },
            labelText: {
                color: {
                    value: 'rgba(51,51,51,1)',
                },
                fontSize: '11px'
            },
            isHighContrast: false,
        };

        /** Performs sample app initialization.*/
        public static initialize(): void {
            this.container = $('#container');
            this.hostControls = new HostControls($('#options'));
            this.hostControls.setElement(this.container);

            let rendererSelect = $('#rendererSelect');
            rendererSelect.on('change', () => this.onChange());

            this.populateVisualTypeSelect();
            powerbi.visuals.DefaultVisualHostServices.initialize();
            // Wrapper function to simplify visualization element creation when using jQuery
            $.fn.visual = function (plugin: IVisualPlugin, rendererName: string, dataView?: DataView[]) {

                // Step 1: Create new DOM element to represent Power BI visual
                let element = $('<div/>');
                element.addClass('visual');
                element['visible'] = () => { return true; };
                this.append(element);
                
                Playground.createVisualElement(element, plugin, dataView, rendererName);
                return this;
            };

            let visualByDefault = jsCommon.Utility.getURLParamValue('visual');
            if (visualByDefault) {
                $('.topBar, #options').css({ "display": "none" });
                this.onChange(visualByDefault.toString());
            } else {
                this.onChange();
            }
        }

        private static onChange(visualType?: string) {
            if (visualType == null) {
                visualType = $('#visualTypes').val();
            }

            this.onVisualTypeSelection(visualType, $('#rendererSelect').val());
        }

        private static createVisualElement(element: JQuery, plugin: IVisualPlugin, dataView?: DataView[], preferredRenderer?: string) {

            let rendererType = <experimental.RendererType>experimental.RendererType[preferredRenderer];

            // Step 2: Instantiate Power BI visual
            this.visualElement = plugin.create();
            this.visualElement.init({
                element: element,
                host: defaultVisualHostServices,
                style: this.visualStyle,
                viewport: this.hostControls.getViewport(),
                settings: { slicingEnabled: true },
                interactivity: { isInteractiveLegend: false, selection: false },
                animation: { transitionImmediate: true },
                preferredRenderer: rendererType,
                rendererFactory: new experimental.RendererFactory(element),
            });
            
            this.hostControls.setVisual(this.visualElement);
        };

        private static populateVisualTypeSelect(): void {
           
            let typeSelect = $('#visualTypes');
            //typeSelect.append('<option value="">(none)</option>');

            let visuals = this.pluginService.getVisuals();
            visuals.sort(function (a, b) {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

            for (let i = 0, len = visuals.length; i < len; i++) {
                let visual = visuals[i];
                if (visual.name === 'basicShape') continue;
                typeSelect.append('<option value="' + visual.name + '">' + visual.name + '</option>');
            }

            typeSelect.change(() => this.onChange());
        }

        private static onVisualTypeSelection(pluginName: string, rendererName: string): void {
            if (pluginName.length === 0) {
                return;
            }

            this.createVisualPlugin(pluginName, rendererName);
            this.hostControls.onPluginChange(pluginName);
        }

        //private static getRenderer(rendererName: string, element: JQuery): visuals.experimental.IVisualRenderer {
        //    switch (rendererName) {
        //        case "SVG":
        //            return new powerbi.visuals.experimental.SvgRenderer(element);
        //        case "Canvas":
        //            return new powerbi.visuals.experimental.CanvasRenderer(element);
        //        case "WebGL":
        //            return new powerbi.visuals.experimental.MinimalWebGLRenderer(element);
        //        case "TwoJS":
        //            return new powerbi.visuals.experimental.TwoWebGLRenderer(element);
        //        case "PIXI":
        //            return new powerbi.visuals.experimental.PixiWebGLRenderer(element);
        //    }

        //    return null;
        //}

        private static createVisualPlugin(pluginName: string, rendererName: string): void {
            this.container.children().not(".ui-resizable-handle").remove();

            let plugin = this.pluginService.getPlugin(pluginName);
            if (!plugin) {
                this.container.append('<div class="wrongVisualWarning">Wrong visual name <span>\'' + pluginName + '\'</span> in parameters</div>'); return;
            }
            this.container.visual(plugin, rendererName);
        }       
        
    }   
}
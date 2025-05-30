import React,{Component, Fragment, useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import ReactDOM from 'react-dom';
import {rix_make_watch_data} from "../store/global_data.js";
const {Metro, $} = window;

export default class RixShortList extends Component {
    render() {
        let props = this.props;
        let Render = ()=> {
            let [update, setUpdate] = useState(0);
            let listview = React.createRef();
            useEffect(()=> {
                let v_height=$(listview.current).height();
                if(v_height === 0) {
                    setUpdate(update+1);
                    return;
                }
                let plugin = Metro.makePlugin(listview.current, "listview", {
                    selectable:false,
                    view:"icons",
                    onNodeClick:(v)=>{
                        console.log("onNodeClick====", v);
                        if(props.onNodeClick) {
                            props.onNodeClick(v);
                        }
                    },
                    onNodeDblclick:(v)=> {
                        if(props.onNodeDblclick) {
                            props.onNodeDblclick(v);
                        }
                    }
                });
                let width = plugin.width();
                let height = plugin.height();
                if(height === 0) {
                    setUpdate(update+1);
                    return;
                }
                let view = plugin.data('listview');
                if(props.draggable){
                    let drag_items = Metro.makePlugin(listview.current, "drag-items");
                    console.log("drag---", drag_items.data("dragitems"));
                    let dragitems = drag_items.data("dragitems");
                    dragitems.off();
                }
                view.element.empty();
                const w = props.width?props.width:100;
                const h = props.height?props.height:100;
                let row = Math.round(height / h) - 1;
                let i = 0;
                let shortlist = props.children;
                console.log("shortlist===", shortlist, props.children);
                if(shortlist&&shortlist.length >0)
                    for(let index = 0; index< shortlist.length; index++) {
                        let v = shortlist[index];
                        let node = view.add(null, {...v.props, icon: 'empty'});
                        if(!node) continue;
                        const root = createRoot(node.find(".icon")[0]);
                        root.render(v.props.icon);
                        node.data("id", v.props.id);
                        if(v.props.onDblclick) {
                            node.on("dblclick", (e)=> {
                                e.preventDefault();
                                v.props.onDblclick(v.props);
                                console.log("node=====dblclick", e);
                            });
                        }
                        if(v.props.onClick) {
                            node.on("click", (e)=> {
                                e.preventDefault();
                                v.props.onClick(v.props);
                                console.log("node=====click", e);
                            });
                        }
                        let pos = {
                            left: w*(Math.floor(i/row)),
                            top: h*(i%row)
                        };
                        node.css(pos);
                        if(v.props.draggable) {
                            Metro.makePlugin(node, "draggable");
                        }
                        i++;
                    }
            });
            // 
            
            let ret = <ul ref={listview} style={{'height':'100%'}}>
                </ul>;
            return ret;
        };
        return <Render/>;
    }
}

RixShortList.Node = class extends Component {
    /*
      <li class="node" style="left: 0px; top: 100px; position: absolute;" data-role-draggable="true" data-role="draggable" id="draggable-1632810819394305">
      <label class="checkbox transition-on"><input type="checkbox" data-role-checkbox="true" data-role="checkbox" class=""><span class="check"></span><span class="caption"></span></label>
      <span class="icon"><img src="/apk/6a03657e2b028d3271454659537b9501.png"></span>
      <div class="data"><div class="caption">豆豆探险闯关2</div></div>
      </li>
    */
    render() {
        return <></>;
        //return <li className='node' {...props}>{props.children}</li>;
    }
}

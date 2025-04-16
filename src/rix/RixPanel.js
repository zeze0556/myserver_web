import React,{Component, Fragment, useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import {rix_make_watch_data} from "../store/datacontext.js";
const {Metro, $} = window;


export default function RixPanel(props) {
    let myref = React.createRef();
    let { children, ...rest_props} = props;
    let icon = children.filter(v=>{
        return v.props['type'] == 'icon';
    })[0];
    
    let customButtons = children.filter(v=> {
        return v.props['type'] == 'button';
    });
    let title = children.filter(v=>{
        return v.props['type'] == 'title';
    });
    children = children.filter(v=>{
        return v.props['type'] != 'icon' && v.props['type'] != 'button'
        && v.props['type'] !='title';
    });
    useEffect(()=> {
        let panel = Metro.makePlugin(myref.current,
                                     "panel",
                                     {
                                         ...rest_props,
                                         titleCaption: 'aa',
                                         titleIcon: icon?"<div></div>":null,
                                         customButtons: customButtons.length>0?[{html:"<span class='mif-rocket'></span>"}]:null,//customButtons.length?"<div></div>": null,
                                         draggable: props.draggable,
                                         collapsible: props.collapsible
                                     });
        let data = panel.data("panel");
        if(title) {
            let icon_root = createRoot(data.panel.find(".panel-title .caption")[0]);
            icon_root.render(title);
        }
        if(icon) {
            let icon_root = createRoot(data.panel.find(".panel-title .icon")[0]);
            icon_root.render(icon);
        }
        if(customButtons.length > 0) {
            let button_root = createRoot(data.panel.find('.panel-title .custom-buttons')[0]);
            let Rend = ()=> {
                let ret = [];
                customButtons.forEach((v, index)=> {
                    ret.push(<Fragment key={index}>{v}</Fragment>);
                });
                return ret;
            };
            button_root.render(<Rend/>);
        }
        return ()=> {
            //data.destroy();
            //panel.remove();
            //data.remove();
        };
    },[]);

    return (<div {...props}><div ref={myref}>
            {children}
            </div></div>);
}

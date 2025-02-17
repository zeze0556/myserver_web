import React,{Component, Fragment, useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import {rix_make_watch_data} from "../store/datacontext.js";
const {Metro, $} = window;


export default function RixSidebar(props) {
    let [update, setUpdate] = useState(0);
    let sidebar = React.createRef();
    let {children, onClick, toggle_ref, shift_ref, ...p} = props;
    useEffect(()=> {
        /*
        let create_ret = null;
        */
        //let sidebar = $(sidebar.current);
        let w = Metro.makePlugin(sidebar.current,
                                 "sidebar",
                                 {
                                     shift: shift_ref.current,//".shifted-content",
                                     toggle: toggle_ref.current,
                                     menuItemClick: false,
                                     /*onToggle(e) {
                                         console.log("eeeeee===", e);
                                     },*/
                                     //toggle: sidebar
                                     ...p
                                 });
        let data = w.data("sidebar");
        data.element.on('click', '.sidebar-menu li  > a', (e)=> {
            e.preventDefault();
            let target = $(e.target);
            if(onClick) {
                onClick(target.data('menu'), e);
            }
        });
    });
    let header = children.filter(v=>v.props['slot'] == 'header');
    let children2 = children.filter(v=>v.props['slot'] != 'header');
    let ret = (<aside className="sidebar pos-absolute z-2"
               ref={sidebar}
               >
               {header}
               <ul className="sidebar-menu">{children2} </ul>
               </aside>);
/*
    let ret = (<aside className="sidebar pos-absolute z-2"
                           ref={sidebar}
                           data-role="sidebar"
                           data-toggle="#sidebar-toggle-3"
                           data-shift=".shifted-content">
               {header}
                        <ul className="sidebar-menu">{children2} </ul>
               </aside>);
               */
    //let ret = (<div ref={sidebar} key={update}>{props.children}</div>);
    return ret;

}

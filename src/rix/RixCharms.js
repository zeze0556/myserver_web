import React,{Component, Fragment, useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import "./RixCharms.css";
const {Metro, $} = window;

export default function RixCharms(props) {
    //let ref = React.createRef();
    let {children, closebutton, ...p} = props;
    let myref = React.createRef();
    let list = props.data.get("list");
    let [update, setUpdate] = useState(0);
    useEffect(()=> {
        let {...p} = props;
        let create_ret = null;
        let d = props.data;
        let w = Metro.makePlugin(myref.current,
                                 "charms",
                                 {...p});
        let charms = w.data("charms");
        let f = d.watch("toggle", ()=> {
            charms.toggle();
        });
        let w_list = d.watch("list", ()=> {
            console.log("watch==== update");
            setUpdate(update+1);
        });
        //charms.toggle();
        return ()=> {
            d.unwatch("toggle", f);
            d.unwatch("list", w_list);
            charms.destroy();
                    };
    });
    let charm_top = list.filter(v=>{
        return v.props.type === "charm-top";
    });
    let charm_bottom = list.filter(v=> {
        return v.props.type === "charm-bottom";
    });
    /*
      <div className="charm-tile">
      <span className="icon mif-tablet-landscape"></span>
      <span className="caption">Tablet mode</span>
      </div>
      <div className="charm-tile">
      <span className="icon mif-wifi-full"></span>
      <span className="caption">Network</span>
      </div>
      <div className="charm-tile">
      <span className="icon mif-cog"></span>
      <span className="caption">Preferences</span>
      </div>
      <div className="charm-tile active">
      <span className="icon mif-rocket"></span>
      <span className="caption">Fly mode</span>
      </div>
<div className="text-center m-4">
                    <span>Google Chrome</span>
                </div>
                <div className="charm-notify">
                    <img className="icon" src="../../images/me.jpg"/>
                    <div className="title">About Author</div>
                    <div className="content">The hornpipe fears with endurance, vandalize the galley until it waves.</div>
                    <div className="secondary">14:17 &bull; www.facebook.com</div>
                </div>
                <div className="text-center m-4">
                    <span>Information</span>
                </div>

                <div className="charm-notify">
                    <span className="icon mif-info"></span>
                    <div className="title">You have a news</div>
                    <div className="content">The hornpipe fears with endurance, vandalize the galley until it waves.</div>
                </div>
                <div className="clear mt-4 reduce-1">
                    <span className="place-left c-pointer">Collapse</span>
                    <span className="place-right c-pointer">Clear notifies</span>
                </div>
                <div className="d-flex">
                <div className="charm-tile active">
                <span className="icon mif-target"></span>
                <span className="caption">Position</span>
                </div>
                <div className="charm-tile">
                <span className="icon mif-bluetooth"></span>
                <span className="caption">Not connected</span>
                </div>
                </div>
      */
    let ret = <div ref={myref} data-role="charms"
    className="charm"
              >
         <div className="h-100 d-flex flex-column">
           <div className="charm-top">
             {
                 charm_top.map((item, index)=>{
                     console.log("show index=", index);
                     return <Fragment key={index}>{item}</Fragment>;
                 })
             }
            </div>
            <div className="charm-bottom mt-auto">
              <div className="d-flex">
                {
                    charm_bottom.map((item, index)=>{
                        return <Fragment key={index}>{item}</Fragment>;
                    })
                }
                </div>
            </div>
        </div>
        </div>;
    return ret;
}

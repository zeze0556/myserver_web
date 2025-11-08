import React,{Component, Fragment, useState, forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import {rix_make_watch_data} from "../store/datacontext.js";
const {Metro, $} = window;

const RixWindow = forwardRef((props, ref)=> {
    //let ref = React.createRef();
    console.log("RixWindow children====", props);
    let {children, closebutton, ...p} = props;
    let [update, setUpdate] = useState(0);
    let mywindow = React.createRef();
    let api = rix_make_watch_data({
        status: props.status || 'normal',
        zIndex: props.zIndex,
        show: props.show || true,
        blocker: null,
    });
    useEffect(()=> {
        let {icon, content, onMinClick, onMaxClick, onCaptionDblClick, onWindowCreate, ...p} = props;
        let create_ret = null;
        let pOnMinClick = onMinClick;
        let ponCaptionDblClick = onCaptionDblClick;
        let ponMaxClick = onMaxClick;
        let status = "normal";
        let w = Metro.makePlugin(mywindow.current,
                                 "window",
                                 {icon:"empty",
                                  onResize:()=> {
                                      console.log("window onResize==");
                                  },
                                  onWindowCreate:function(...e){
                                      create_ret = e;
                                 },
                                  onMinClick: (...e)=> {
                                      win.hide();
                                      if(pOnMinClick) {
                                          pOnMinClick(e);
                                      }
                                  },
                                  onCaptionDblClick:(...e)=> {
                                      if(status == 'max') {
                                          status = "normal";
                                      } else if(status == "normal") {
                                          status = "max";
                                      }
                                      if(ponCaptionDblClick) {
                                          ponCaptionDblClick(e);
                                      }
                                  },
                                  onMaxClick:(...e)=> {
                                      //this.status = "max";
                                      if(status == 'max') {
                                          status = "normal";
                                      } else if(status == "normal") {
                                          status = "max";
                                      }
                                      if(ponMaxClick) {
                                          ponMaxClick(e);
                                      }
                                  },
                                  onDragStart:(...e)=> {
                                      let area = $(".window-area");
                                      let blocker = $("<div>")
                                          .addClass("window-blocker")
                                          .css({
                                              position: "absolute",
                                              left: 0,
                                              top: 0,
                                              width: "100%",
                                              height: "100%",
                                              zIndex: 99999,
                                              cursor: "move"
                                          })
                                          .appendTo(area);
                                      api.set("blocker", blocker);
                                      props.onActive();
                                  },
                                  onDragStop:(...e)=> {
                                      api.blocker.remove(); // 移除遮罩层
                                  },
                                  ...p});
        let win = w.data("window");
        let icon_root = createRoot(win.win.find(".window-caption .icon")[0]);
        //ReactDOM.render(icon,);
        icon_root.render(icon);
            w.data('dragElement', '.window-caption');
        let watch_zindex = api.watch('zIndex', ()=> {
            console.log("watch_zindex==", api.zIndex);
            win.win.css("z-index", api.zIndex);
        });
        let watch_status = api.watch('status', ()=> {
            if(api.status === 'max') win.max(true);
            else {
                win.max(false);
            }
        });
        let watch_show = api.watch('show', ()=> {
            if(api.show) {
                win.min(false);
                if(api.status === 'max') win.max(true);
                else {
                    win.max(false);
                }
                win.show();
            } else {
                win.hide();
            }
        });
        if(onWindowCreate) {
            setTimeout(()=> {
                onWindowCreate(win,api, ...create_ret);
            }, 100);
        } else {
        }
        return ()=> {win.close();
                     api.unwatch('show', watch_show);
                     api.unwatch('status', watch_status);
                     api.unwatch('zIndex', watch_zindex);
                    };
    });
    let show = ()=> {
        let w = $(mywindow.current);
        console.log("show======", w, api);
        api.set('show', true);
    };
    let hide = ()=> {
        let w = $(mywindow.current);
        api.set("show", false);
    };
    let set_zIndex = (v)=> {
        console.log("outapi set self zIndex==", v);
        api.set("zIndex", v);
    };
    useImperativeHandle(ref, () => ({
        show,
        hide,
        set_zIndex,
        api
    }));
    let ret = (<div ref={mywindow} style={{'height':'100%'}} key={update}>{children}</div>);
    return ret;
});
export default RixWindow;

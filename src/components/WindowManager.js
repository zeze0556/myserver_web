import React, { Fragment, createContext, useContext, useState, useRef } from 'react';
import AppWindow from './AppWindow';

const WindowManagerContext = createContext();

export const useWindowManager = () => {
    return useContext(WindowManagerContext);
};

const window_top = 1000;

export const WindowManagerProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const closeWindow = ( id) => {
        setWindows((prevWindows) => {
            let ret = prevWindows.filter((window) => window.id !== id);
            return ret;
        });
    };

    const minWindow= (id) => {
        setWindows((prevWindows) => {
            let old = prevWindows;
        for (let w of old) {
            if (w.id === id) {
                w.content = React.cloneElement(w.content, { hidden: true});
            }
        }
        return [...old];
        });
    };

    const getApps= ()=> {
        return windows;
    };
    const activeApp = (id) => {
        setWindows((prevWindows) => {
            let old = prevWindows;
            for (let w of old) {
                if (w.id != id && w.zIndex == window_top) {
                    w.zIndex = w.org_zIndex;
                    w.content = React.cloneElement(w.content, { zIndex: w.zIndex });
                }
                if (w.id === id) {
                    w.zIndex = window_top;
                    w.content = React.cloneElement(w.content, { zIndex: w.zIndex, hidden:false });
                }
            }
            return [...old];
        });
    };

    const openWindow = (window_ref, id, title, View) => {
        let old = windows;
        let find = old.filter(v=>v.id == id)[0];
        if(find) {
            activeApp(find.id);
            return;
        }
        let max_z = 0;
        let Content = (props)=> {
            let new_props = {...props,
                             onActive:()=> activeApp(id),
                             onMinimize:()=> minWindow(id),
                maxwidth: window_ref.current.offsetWidth,
                maxheight: window_ref.current.offsetHeight,
                            };
            let el = React.cloneElement(View, {
                id,
                maxwidth: window_ref.current.offsetWidth,
                maxheight: window_ref.current.offsetHeight,
                onClose: (e) => {
                    e.preventDefault();
                    closeWindow(id);
                },
                onActive: (e) => {
                    e.preventDefault();
                    activeApp(id);
                },
                zIndex: window_top,
            });
            return <AppWindow {...new_props}
                   >
                {el}
                   </AppWindow>;
        };
        let new_w = {
            id, title,
            left: 0,
            top: 0,
            org_zIndex: (max_z + 1),
            zIndex: window_top,
            content: <Content key={id} zIndex={window_top}/>
        };
        let new_v= [...old, new_w];
        setWindows(new_v);
        activeApp(id);
    };

    return (
        <WindowManagerContext.Provider value={{ windows, openWindow, closeWindow, minWindow, getApps, activeApp }}>
            {children}
        </WindowManagerContext.Provider>
    );
};

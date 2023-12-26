import React, {useState, useCallback, useContext}from 'react';

import Api from "../api.js";

export const WatchData = {
    watchlist:{},
    set(key,v){
        if(key === 'uid' || key === 'api_token') {
            //mylocal.setItem(key, v);
        }
        this[key] = v;
        this.update(key);
    },
    update(key) {
        if(this.watchlist[key]) {
            let v = this[key];
            this.watchlist[key].map(v2 => {
                let {obj, fn} = v2;
                if(obj) {
                    obj[fn](v,key);
                } else {
                    fn(v,key);
                }
            });
        }
    },
    get(key, v=null, fn=null) {
        if(!this[key]) {
            if(v) {
                this[key] = v;
            }
            if(fn) {
                fn();
            }
        }
        return this[key];
    },
    watch(key, fn,obj) {
        if(!this.watchlist[key]) {
            this.watchlist[key] = [];
        }
        let index = this.watchlist[key].findIndex(v=>v === fn);
        if(index >=0)
            return this.watchlist[key][index];
        this.watchlist[key].push({obj:obj, fn:fn});
        return fn;
    },
    unwatch(key, fn, obj) {
        if(!this.watchlist[key]) {
            this.watchlist[key] = [];
            return;
        }
        let index = this.watchlist[key].findIndex(v=>v.obj === obj && v.fn === fn);
        if(index >=0)
            this.watchlist[key].splice(index, 1);
    }
};
export const init_data = {
    user:{},
    api_token: '',
    disks:{},
    navigation_enable:false,
    alerts:[],
    ...WatchData
    //shortlist_notify:()=>{},
    //update:()=>{},
    //set_shortlist:()=>{}
};

export function rix_make_watch_data(obj) {
    let ret = {...obj, ...WatchData};
    return ret;
}

export const DataContext = React.createContext(init_data);

export function useData() {
    return useContext(DataContext);
};


export const DataProvider = ({ children }) => {
    //const [update, setUpdate] = useState(0);

    const contextValue = {
        ...init_data,
        //update: useCallback(() => setUpdate(update+1), []),
    };
    Api.Init(contextValue);

    return (
        <DataContext.Provider value={{global_data:contextValue, make_watch_data:rix_make_watch_data, api: Api}}>
            {children}
        </DataContext.Provider>
    );
}

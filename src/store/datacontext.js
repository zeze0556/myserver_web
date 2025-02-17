import React, {useState, useCallback, useContext}from 'react';
/*
var orignalSetItem = localStorage.setItem;
localStorage.setItem = function(key,newValue){
    var setItemEvent = new Event("setItemEvent");
    setItemEvent.newValue = newValue;
    window.dispatchEvent(setItemEvent);
    orignalSetItem.apply(this,arguments);
}
window.addEventListener("setItemEvent", function (e) {
    alert(e.newValue);
});

*/
let mylocal = {
    setItem:(a,v)=> {
    },
    getItem:(a)=> {
        return undefined;
    },
};

if(window.localStorage){
    mylocal = window.localStorage;
}else{
}

/*
window.addEventListener('storage', function(event){
    console.log("change storage ", event);
});
*/

export function update_storage(key, v) {
    mylocal.setItem(key, v);
}

export function clear_storage() {
    mylocal.clear();
}

export const WatchData = {
    watchlist:{},
    set(key,v){
        if(key === 'logined' || key === "api_token") {
            mylocal.setItem(key, v);
        }
        this[key] = v;
        console.log("datacontext this==", this);
        if(this.watchlist[key]) {
            this.watchlist[key].map(v2 => {
                let {obj, fn} = v2;
                console.log("notify11===",key, v, obj);
                if(obj) {
                    obj[fn](v,key);
                } else {
                    fn(v,key);
                }
            });
        }
    },
    update(key) {
        if(this.watchlist[key]) {
            let v = this[key];
            this.watchlist[key].map(v2 => {
                let {obj, fn} = v2;
                console.log("notify===",key, v);
                if(obj) {
                    obj[fn](v,key);
                } else {
                    fn(v,key);
                }
            }
                                   );
        }
    },
    get(key) {
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

export function rix_make_watch_data(obj) {
    let ret = {...obj, ...WatchData};
    return ret;
}

export const init_data = {
    user:{},
    uid: mylocal.getItem("uid"),
    api_token: mylocal.getItem("api_token"),
    logined: mylocal.getItem("logined"),
    apps:[],
    signs:[],
    shortlist:[],
    wins:{},
    desktop:null,
    dialog: null,
    ...WatchData
    //shortlist_notify:()=>{},
    //update:()=>{},
        //set_shortlist:()=>{}
};

export const DataContext = React.createContext(init_data);

export function useData() {
    return useContext(DataContext);
};

//export default DataProvider;

export default function DataProvider ({ children }) {
    //const [update, setUpdate] = useState(0);

    const contextValue = {
        ...init_data,
        //update: useCallback(() => setUpdate(update+1), []),
    };

    return (
            <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

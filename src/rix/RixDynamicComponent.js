import React, { useState, useEffect, lazy, Suspense,forwardRef } from 'react';

const RixDynamicComponent = forwardRef(({path, rix_type, ...props}, ref) => {
    switch(rix_type) {
    case 'component': {
        let Component = lazy(()=> import(`@/${path}`));
        return <Suspense fallback={<div>Hi, This page is Loading...</div>} >
            <Component {...props} ref={ref}/>
            </Suspense>;
        break;
    }
    case 'module': {
    }
        break;
    }
    return null;
});

export default RixDynamicComponent;

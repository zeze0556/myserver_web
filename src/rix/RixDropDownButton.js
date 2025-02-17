import React, {forwardRef,useState, Fragment,useEffect, useRef, useContext } from 'react';


export default function RixDropDownButton(props) {

    return <div class="dropdown-button">
        <button class="button dropdown-toggle">Button</button>
        <ul class="d-menu" data-role="dropdown">
        <li><a href="#">Reply</a></li>
        <li><a href="#">Reply All</a></li>
        <li><a href="#">Forward</a></li>
        </ul>
        </div>;
}

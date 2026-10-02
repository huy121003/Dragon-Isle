"use strict";

/* GUIDE: Shared HTML list/table helpers for guide sections. */
function guideList(items){return '<ul class="guide-list">'+items.map(item=>'<li>'+item+'</li>').join('')+'</ul>';}

function guideTable(headers,rows){
  return '<div class="guide-table-scroll"><table class="guide-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+
    '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

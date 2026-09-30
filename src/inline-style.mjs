/* Keep CSS custom properties unchanged when legacy HTML is rendered through React. */
export function inlineStyle(value){
  const style={};
  for(const declaration of value.split(';')){
    const pos=declaration.indexOf(':');
    if(pos<0)continue;
    const name=declaration.slice(0,pos).trim();
    if(!name)continue;
    const property=name.startsWith('--')?name:name.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
    style[property]=declaration.slice(pos+1).trim();
  }
  return style;
}

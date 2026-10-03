/**
 * Build Ant Design dismissal props for a modal that must stay open during a battle.
 * The active match can only end through its explicit forfeit action.
 */
export function battleModalDismissalProps(locked,onDismiss){
  return {
    closable:!locked,
    maskClosable:!locked,
    keyboard:!locked,
    onCancel:()=>{if(!locked)onDismiss?.();}
  };
}

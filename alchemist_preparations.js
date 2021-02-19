/*
This macro gives you your infused reagents for the day.
*/
(async () => {
  function say(text){
    ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: text
    }, {});
  }
  if (canvas.tokens.controlled.length != 1) {
    ui.notifications.warn("You must have exactly one actor selected.");    
    return;
  }
  const token = canvas.tokens.controlled[0];
  const item = token.actor.data.items.find(item => item.type === 'consumable' && item.name === 'Infused Reagents');
  if (item) {
      token.actor.updateEmbeddedEntity("OwnedItem", [{"_id": item._id, "data.quantity.value": token.actor.data.data.abilities.int.mod + token.actor.level}]);
      say("gets their reagents ready for the day.");
  }
    
})();

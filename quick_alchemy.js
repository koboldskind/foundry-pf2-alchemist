/*
This Foundry VTT macro opens a dialog for your alchemist's Quick Alchemy ability. 
It lets you select one of your formulae, crafts one item of that type, and used up one of your infused reagents.
*/
(async () => {
  function packName(fullName){
    let idx = fullName.lastIndexOf(".");
    return fullName.substring(1, idx);
  }
  function entryId(fullName){
    let idx = fullName.lastIndexOf(".");
    return fullName.substring(idx + 1, fullName.length - 1);
  }
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
  const actor = token.actor;
  const charName = actor.name;
  
  //let's find your formula book
  const bookName = charName + "'s Formula Book";
  const book = JournalEntry.collection.getName(bookName);
  if (!book){
    ui.notifications.warn("Cannot read journal '" + bookName + "'");    
  }

  //find your reagents
  const reagents = actor.data.items.find(item => item.type === 'consumable' && item.name === 'Infused Reagents');
  if (!reagents || reagents.data.quantity.value == 0){
    say(" thrusts their hands into their reagent bag and pulls them out empty");
    return;
  }

  //parse your formula book
  const content = book.data.content;
  const waiters = content.match(/\[.*\]/g).map(e => {
    let pack = game.packs.get(packName(e));
    return pack.getIndex().then(index => pack.getEntity(entryId(e)));
  });

  //convert your formulae into buttons to create a dialogue
  const buttons = Promise.all(waiters)
  .then(arr => {
    let res = {};
    arr.forEach(e => res[e.name] = {icon: '<img height="32" width="32" src="' + e.img + '"></img>', label: e.name, callback: () => {
      //use up some reagents
      actor.updateEmbeddedEntity("OwnedItem", [{"_id": reagents._id, "data.quantity.value": reagents.data.quantity.value - 1}]);
      //create the item with a prefix so we know it spoils quickly
      const qaName = "Quick Alchemy: " + e.data.name; 
      const qaItem = actor.data.items.find(item => item.name === qaName);
      if (qaItem){
        actor.updateEmbeddedEntity("OwnedItem", [{"_id": qaItem._id, "data.quantity.value": qaItem.data.quantity.value + 1}]);
      } else {
        e.data.name = qaName;
        actor.createOwnedItem(e.data);
      }
      say("uses Quick Alchemy and creates a(n) @Compendium[" + e.compendium.metadata.system + "." + e.compendium.metadata.name + "." + e.id + "].");
    }});
    return res;
  })
  //finally, display the dialogue
  .then(buttons => {
    const d = new Dialog({
      title: "Quick Alchemy",
      content: "What do you craft?",
      buttons: buttons
    });
    d.render(true);
  });
})();

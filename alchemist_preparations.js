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

  //check for reagents
  const reagents = actor.data.items.find(item => item.type === 'consumable' && item.name === 'Infused Reagents');
  if (!reagents){ 
     ui.notifications.warn("You must have Infused Reagents.");    
	 return;
  }

  const deletes = [];
  const creates = [];
  const updates = [];

  actor.data.items.filter(item => item.name.startsWith('Advanced Alchemy:')).forEach(item => deletes.push(item._id));
    
  const bookName = charName + "'s Formula Book";
  const book = JournalEntry.collection.getName(bookName);
  if (!book){
    ui.notifications.warn("Cannot read journal '" + bookName + "'");    
  }
  const content = book.data.content;
  const waiters = content.match(/\[.*\]/g).map(e => {
    let pack = game.packs.get(packName(e));
    return pack.getEntity(entryId(e));
  });
  const buttons = Promise.all(waiters)
  .then(arr => {
    let dialogContent = '<div class="form-group" id="advanced-alchemy">';
    arr.forEach(e => {
		dialogContent += `<p><input style="width: 20px;" type="number" name="${e.name}" value="0" length="1"  data-compendium-pack="${e.compendium.metadata.system}.${e.compendium.metadata.name}" data-compendium-id="${e.id}"/> ${e.name}</p>`
	});
	dialogContent += "</div>";
    return dialogContent;
  })
  .then(content => {
    const d = new Dialog({
      title: "Advanced Alchemy",
      content: content,
      buttons: {
		  ok: {
			icon: '<i class="fas fa-check"></i>',
			label: "OK",
			callback: () => {
				let reagentCount = {rc: token.actor.data.data.abilities.int.mod + token.actor.level};
				const waiters = [];
				$('#advanced-alchemy input').each(function(){
					const el = $(this);
					if (el.val() > 0){
						let pack = game.packs.get(el.attr("data-compendium-pack"));
						waiters.push(pack.getEntity(el.attr("data-compendium-id")).then(e => {
							reagentCount.rc -= el.val();
							console.log(e);
							e.data.name = "Advanced Alchemy: " + e.data.name; 
							e.data.data.quantity.value = el.val() * 2;
							creates.push(e.data);
						}));
					}
			    });
				Promise.all(waiters)
					.then(() => actor.deleteEmbeddedEntity("OwnedItem", deletes))
					.then(() => actor.createEmbeddedEntity("OwnedItem", creates))
					.then(() => {
						updates.push({"_id": reagents._id, "data.quantity.value": reagentCount.rc});
						actor.updateEmbeddedEntity("OwnedItem", updates)
					});
			}
		}
	  }
    });
    d.render(true);
  });


})();

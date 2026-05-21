the trainer should be created by admin only . admin will create a trainer in a section by  entering a trainer name , age , gender , mobile number  and create a password(later give to trainer so they enter their mobile number and password to login, they cant create account only admin will) click on save . and admin can see trainers list can edit their details , delete them or deactivate them . once they log in to their account they can add new clients plan they can enter and save it but later they cannot remove them . only admin can remove the client from application data from admin dashboard , trainer cant remove them they can just add them , if too many pages give bottom navigation for trainer and admin . 

also if trainer wants to delete a client they can send request to admin to delete , and push a notification to admin that some trainer has sent a 
client deletion request then admin will delete them . 
and for trainer while entering client details if they enter anything wrong trainer should be able to edit and save those details again . will update everywhere accordingly . 

add read more and read less option for trainer notes so if too long it will be useful . remove start icon from everywhere like on generate new plan button , remove such start symbols/icon/emoji on every button also on sample case card  .

issues in current application :

selections and toggle buttons are not fast , taking some milli sec time to take action when clicked on anything . 
and what is mean by sample case toggle , when i  on it is says complex case plan generation blocked , this is meaningless workflow and it gives a button for save and book consultation  . like if a client is complex the trainer can give tag later any time not while creating them and can update that tag like complex or active or nice something like that . cause after spending some time with client we will get to know about them . 
and how is calorie target and protein target is being generated cant we edit it later and save . 
and when clicked on approve and export why is there option to take rating then only before event client trying the recipe . trainer will take feedback from the client and come to the app and select the client and select their previous generated plan and then give rating to those meals and click on save and it will be updated and admin will get notification and can see the meal plan for which the rating was given and for what client and can see client details , and admin can save such meal plans to understand what meal plans people are liking according to their body type . so admin can re assign that meal plan to any existing client also . 

and why is admin dashboard functionality and trainer dashboard functionality is same . all same features , admin wont add clients , can remove them and see all their details , rating meal plans for the week and the name of trainer who is handling them . can reassign other meals . 

if the course is completed for a client , trainer will click on client closed and then client will be removed from trainer dashboard and will be saved permanently and admin can see the completed clients list their details and their meal plans and ratings and all . can delete them permanently if they want from the list or can keep it like that only . 

admin should able to see all the list of meal plans available in their database , can select any one and can assign it to any client , 
test case :
if trainer generated a meal plan and client did not like it and trainer can request to admin to change the meal plan and admin will get notification and then admin will see the issue and replace the selected meal plan from after , morning anything among them or can change everything . and assign it and click on update . now trainer will get notified that admin changes the meal plan .

make sure to keep proper wiring with id of trainer , client and admin and their features . 

push notifications for admin if any new client is added by any trainer and also if a new rating is given by some trainer . also if some client is in critical tag , trainer can update that tag any time and save . 
-- insert into venues (venue_name, address) values ('LeVel33', '8 Marina Blvd #33-01'), ('Odette', '1 St Andrew Rd #33-01'), ('Sona Grill Restaurant', '12 Gopeng St #01-82');

insert into lunch_groups (group_id, user_id) values (1,2), (1,3), (2,1), (3,1), (3,2);

-- INSERT INTO group_details("id","title","description","venue_id","max_capacity","creator_id","meeting_date","meeting_time", "is_deleted", "created_at")
-- VALUES
-- (1,'test group','Enginenr finding friends',2,5,1,'2022-01-01','12:44:00', FALSE, '2021-12-28 02:40:38.203062+08'),
-- (2,'test group 2','Come join in the fun!',1,5,2,'2022-01-05','13:18:00', FALSE, '2021-12-28 10:54:39.137402+08'),
-- (3,'test group 3','Lets hang out over some nice afternoon beer!',3,3,3,'2022-01-08','11:55:00',FALSE,'2021-12-28 10:55:55.785842+08'),
-- (4,'Awesome lunch!','Join me for lunch on new years eve :D',2,5,2,'2022-01-05','12:00:00',FALSE,'2021-12-30 13:56:01.933818+08');

-- INSERT INTO users ("id","first_name","last_name","email","password","photo","join_date")
-- VALUES
-- (1,'Emma','Smith',E'test1@gmail.com','b16ed7d24b3ecbd4164dcdad374e08c0ab7518aa07f9d3683f34c2b3c67a15830268cb4a56c1ff6f54c8e54a795f5b87c08668b51f82d0093f7baee7d2981181','1b46cb0c651afbcf567d490d0b9b23d0','2021-12-28 02:37:36.746685+08'),
-- (2,'John','Doe',E'test2@gmail.com','6d201beeefb589b08ef0672dac82353d0cbd9ad99e1642c83a1601f3d647bcca003257b5e8f31bdc1d73fbec84fb085c79d6e2677b7ff927e823a54e789140d9','d4e8b19bf5825d0fb180ee39b93a708a','2021-12-28 10:40:37.175181+08'),
-- (3,'Paul','Tyler','test3@gmail.com','cb872de2b8d2509c54344435ce9cb43b4faa27f97d486ff4de35af03e4919fb4ec53267caf8def06ef177d69fe0abab3c12fbdc2f267d895fd07c36a62bff4bf','396068ba94a6d3ef5bdcaa4f8c161032','2021-12-28 10:40:55.449076+08');
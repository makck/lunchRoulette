-- create table users (id serial primary key, first_name text, last_name text, email text, password text, photo text, join_date timestamptz not null default now());

-- create table messages (id serial primary key, group_id integer, user_id integer, message text, created_at timestamptz not null default now());

-- create table group_details (id serial primary key, title text, description text, venue_id integer, max_capacity integer, creator_id integer, meeting_date date, meeting_time time, is_deleted boolean, created_at timestamptz not null default now());

create table lunch_groups (id serial primary key, group_id integer, user_id integer, created_at timestamptz not null default now());

-- create table users_reputation (id serial primary key, user_id integer, num_likes integer, num_dislikes integer);

-- create table venues (id serial primary key, venue_name text, address text, created_at timestamptz not null default now());
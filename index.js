import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import jsSHA from 'jssha';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import moment from 'moment';

const { Pool } = pg;
const pgConnectConfigs = {
  user: 'Chan Keet',
  host: 'localhost',
  database: 'lunchroulette',
  port: 5432,
};

const SALT = 'passworddrowssap';

const getHashSession = (input) => {
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

  const unhashedString = `${input}-${SALT}`;

  shaObj.update(unhashedString);

  return shaObj.getHash('HEX');
};

const checkAuth = (req, res, next) => {
  req.isUSerLoggedIn = false;

  if (req.cookies.loggedInHash && req.cookies.userFirstName && req.cookies.userLastName) {
    const hash = getHashSession(req.cookies.userFirstName + req.cookies.userLastName);

    if (req.cookies.loggedInHash === hash) {
      req.isUSerLoggedIn = true;
    }
  }

  next();
};

const pool = new Pool(pgConnectConfigs);

const app = express();
const multerUpload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

// Route to index (list of groups)
app.get('/', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const userProfile = req.cookies;

  const sqlQuery = `
  WITH num_participants AS (
    SELECT
      group_id,
      COUNT(DISTINCT user_id)+1 num_members
    FROM lunch_groups
    GROUP BY 1
  )
  SELECT
    a.id,
    TO_CHAR(a.meeting_date, 'DD-Mon') meeting_date,
    a.meeting_time,
    a.title,
    a.max_capacity,
    a.creator_id,
    d.venue_name,
    b.first_name,
    b.photo,
    c.num_members
  FROM group_details a
  JOIN users b
    ON a.creator_id = b.id
  LEFT JOIN num_participants c
    ON a.id = c.group_id
  JOIN venues d
    ON a.venue_id = d.id
  WHERE date(a.meeting_date) >= CURRENT_DATE
    AND NOT is_deleted
  ORDER BY a.meeting_date
  `;

  pool
    .query(sqlQuery)
    .then((result) => {
      const groupData = result.rows;
      res.render('index', { groupData, userProfile });
    })
    .catch((error) => {
      console.log('Error executing index query', error.stack);
      res.status(503).send('Error');
    });
});

// Route to signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', multerUpload.single('photo'), (req, res) => {
  const shaObj2 = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj2.update(req.body.password);
  const hashedPassword = shaObj2.getHash('HEX');

  const inputData = [req.body.first_name, req.body.last_name, req.body.email, hashedPassword, req.file.filename];

  const sqlQuery = `
  INSERT INTO users (first_name, last_name, email, password, photo) VALUES ($1, $2, $3, $4, $5);
  `;

  pool.query(sqlQuery, inputData).catch((error) => {
    console.log('Insert query error', error.stack);
    res.status(503).send('Erorr');
  });
});

// Route to login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const sqlQuery = `
  SELECT * FROM users WHERE email=$1;
  `;

  const userEmail = [req.body.email];
  pool
    .query(sqlQuery, userEmail)
    .then((result) => {
      if (result.rows.length === 0) {
        res.status(403).send('login failed');
        return;
      }

      const user = result.rows[0];

      const shaObj3 = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

      shaObj3.update(req.body.password);
      const hashedPassword = shaObj3.getHash('HEX');

      if (user.password !== hashedPassword) {
        res.status(503).send('login failed');
      }

      res.cookie('loggedInHash', getHashSession(user.first_name + user.last_name));
      res.cookie('userId', user.id);
      res.cookie('userFirstName', user.first_name);
      res.cookie('userLastName', user.last_name);
      res.cookie('userProfilePic', user.photo);

      res.redirect('/');
    })
    .catch((error) => {
      console.log('Error executing query', error.stack);
      res.status(503).send('Error');
    });
});

// Route to create group
app.get('/creategroup', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const userProfile = req.cookies;

  const sqlQuery = 'SELECT DISTINCT id, venue_name FROM venues ORDER BY venue_name';

  pool
    .query(sqlQuery)
    .then((result) => {
      const venuesList = result.rows;
      res.render('createGroup', { venuesList, userProfile });
    })
    .catch((error) => {
      console.log('Error executing query', error.stack);
      res.status(503).send('Error');
    });
});

app.post('/creategroup', (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const inputData = [req.body.title, req.body.description, req.body.venue_id, req.body.max_capacity, req.cookies.userId, req.body.meeting_date, req.body.meeting_time];

  const insertQuery = 'INSERT INTO group_details (title, description, venue_id, max_capacity, creator_id, meeting_date, meeting_time) VALUES ($1, $2, $3, $4, $5, $6, $7)';

  pool
    .query(insertQuery, inputData)
    .then(() => {
      res.redirect('/');
    })
    .catch((error) => {
      console.log('Error with insert query', error.stack);
      res.status(503).send('Erorr');
    });
});

// Route to view group details
app.get('/group/:id', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }
  const userProfile = req.cookies;

  const groupSelected = [req.params.id];
  const sqlQuery = `
    WITH num_participants AS (
        SELECT
          group_id,
          COUNT(DISTINCT user_id)+1 num_members
        FROM lunch_groups
        GROUP BY 1
      )
      SELECT
        a.id,
        TO_CHAR(a.meeting_date, 'DD-Mon') meeting_date,
        a.meeting_time,
        a.title,
        a.description,
        d.venue_name,
        d.address,
        b.first_name creator_first_name,
        b.photo creator_photo,
        c.num_members
      FROM group_details a
      JOIN users b
        ON a.creator_id = b.id
      LEFT JOIN num_participants c
        ON a.id = c.group_id
      JOIN venues d
        ON a.venue_id = d.id
      WHERE date(a.meeting_date) >= CURRENT_DATE
        AND a.id = $1
      ORDER BY a.meeting_date
  `;

  pool
    .query(sqlQuery, groupSelected)
    .then((mainResult) => {
      const memberQuery = `
        SELECT
          b.first_name,
          b.last_name,
          b.photo
        FROM lunch_groups a
        JOIN users b
          ON a.user_id = b.id
        WHERE a.group_id = $1
      `;
      pool
        .query(memberQuery, groupSelected)
        .then((memberResult) => {
          const messageQuery = `
            SELECT
              a.*,
              b.first_name,
              b.last_name,
              b.photo
            FROM messages a
            LEFT JOIN users b
              ON a.user_id = b.id
            WHERE group_id = $1 
            ORDER BY a.created_at DESC`;

          pool
            .query(messageQuery, groupSelected)
            .then((messageResult) => {
              const mainData = mainResult.rows;
              const memberData = memberResult.rows;
              const messageData = messageResult.rows;

              messageData.forEach((messageRow) => {
                messageRow.created_at = moment(messageRow.created_at).from();
              });

              res.render('singleGroup', {
                mainData, memberData, messageData, userProfile, groupSelected,
              });
            })
            .catch((error) => {
              console.log('Query error', error.stack);
              res.status(503).send('Error');
            });
        });
    })
    .catch((error) => {
      console.log('Query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route to post messages in groups
app.post('/group/:id/message', (req, res) => {
  const sqlQuery = 'INSERT INTO messages (group_id, user_id, message) VALUES ($1, $2, $3)';

  pool
    .query(sqlQuery, [req.params.id, req.cookies.userId, req.body.message])
    .then(() => {
      res.redirect(`/group/${req.params.id}`);
    })
    .catch((error) => {
      console.log('Query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route to view list of groups user is part of
app.get('/mygroups', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const userProfile = req.cookies;

  const sqlQueryCurrent = `
    WITH num_participants AS (
      SELECT
        group_id,
        COUNT(DISTINCT user_id)+1 num_members
      FROM lunch_groups
      GROUP BY 1
    )
    SELECT DISTINCT
      a.id,
      TO_CHAR(a.meeting_date, 'DD-Mon') meeting_date,
      a.meeting_time,
      a.title,
      a.max_capacity,
      a.creator_id,
      d.venue_name,
      b.first_name,
      b.photo,
      c.num_members
    FROM group_details a
    JOIN users b
      ON a.creator_id = b.id
    LEFT JOIN num_participants c
      ON a.id = c.group_id
    JOIN venues d
      ON a.venue_id = d.id
    LEFT JOIN lunch_groups e
      ON a.id = e.group_id
    WHERE date(a.meeting_date) >= CURRENT_DATE
      AND (e.user_id = $1 OR a.creator_id =$1)
      AND NOT is_deleted
    ORDER BY 2
    `;

  const sqlQueryPast = `
    WITH num_participants AS (
      SELECT
        group_id,
        COUNT(DISTINCT user_id)+1 num_members
      FROM lunch_groups
      GROUP BY 1
    )
    SELECT
      a.id,
      TO_CHAR(a.meeting_date, 'DD-Mon') meeting_date,
      a.meeting_time,
      a.title,
      a.max_capacity,
      a.creator_id,
      d.venue_name,
      b.first_name,
      b.photo,
      c.num_members
    FROM group_details a
    JOIN users b
      ON a.creator_id = b.id
    LEFT JOIN num_participants c
      ON a.id = c.group_id
    JOIN venues d
      ON a.venue_id = d.id
    WHERE date(a.meeting_date) < CURRENT_DATE
      AND a.creator_id = $1
      AND NOT is_deleted
    ORDER BY a.meeting_date
    `;

  pool
    .query(sqlQueryPast, [userProfile.userId])
    .then((results) => {
      const pastGroupData = results.rows;

      pool
        .query(sqlQueryCurrent, [userProfile.userId], (error, result) => {
          const currentGroupData = result.rows;

          res.render('myGroups', { currentGroupData, pastGroupData, userProfile });
        });
    })
    .catch((pastError) => {
      console.log('Erorr with query', pastError.stack);
      res.status(503).send('Error');
    });
});

// Route for owner to edit group
app.get('/group/:id/edit', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const userProfile = req.cookies;

  const sqlVenueQuery = 'SELECT DISTINCT id, venue_name FROM venues ORDER BY venue_name';

  const sqlQuery = `
    SELECT 
      a.*,
      b.venue_name
    FROM group_details a
    JOIN venues b
      ON a.venue_id = b.id
    WHERE a.id=$1
    `;

  pool
    .query(sqlQuery, [req.params.id])
    .then((result) => {
      const groupDetails = result.rows[0];
      pool.query(sqlVenueQuery, (venueError, venueResult) => {
        const venuesList = venueResult.rows;
        res.render('editGroup', { groupDetails, userProfile, venuesList });
      });
    })
    .catch((error) => {
      console.log('Query error', error.stack);
      res.status(503).send('Error');
    });
});

app.put('/group/:id/edit', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const inputData = [req.body.title, req.body.description, req.body.meeting_date, req.body.meeting_time, req.body.venue_id, req.body.max_capacity, req.params.id];

  const sqlQuery = 'UPDATE group_details SET title=$1, description=$2, meeting_date=$3, meeting_time=$4, venue_id=$5, max_capacity=$6 WHERE id=$7';

  pool
    .query(sqlQuery, inputData)
    .then(() => {
      res.redirect(`/group/${req.params.id}`);
    })
    .catch((error) => {
      console.log('Update query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route for owner to delete group
app.delete('/group/:id/delete', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const sqlQuery = 'UPDATE group_details SET is_deleted=TRUE WHERE id=$1';

  pool
    .query(sqlQuery, [req.params.id])
    .then(() => {
      res.redirect('/mygroups');
    })
    .catch((error) => {
      console.log('Update query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route to join group
app.get('/group/:id/join', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const userProfile = req.cookies;

  const memberQuery = 'SELECT DISTINCT user_id FROM lunch_groups WHERE group_id = $1';

  let userJoined = false;
  console.log('normal', req.cookies.userId);
  console.log('int', parseInt(req.cookies.userId));
  pool
    .query(memberQuery, [parseInt(req.params.id)])
    .then((memberResult) => {
      memberResult.rows.forEach((element) => {
        if (element.user_id === parseInt(req.cookies.userId)) {
          userJoined = true;
          console.log('looping...', userJoined);
        }
      });

      if (userJoined) {
        res.render('alreadyJoined', { userProfile });
      } else if (!userJoined) {
        const insertQuery = 'INSERT INTO lunch_groups (group_id, user_id) VALUES ($1, $2)';

        pool.query(insertQuery, [parseInt(req.params.id), parseInt(req.cookies.userId)]);

        res.render('joined', { userProfile });
      }
    })
    .catch((error) => {
      console.log('Query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route to leave group
app.delete('/group/:id/leave', checkAuth, (req, res) => {
  if (req.isUSerLoggedIn === false) {
    res.status(403).redirect('/login');
    return;
  }

  const sqlQuery = `
    DELETE FROM lunch_groups WHERE group_id = $1 and user_id = $2
  `;

  pool
    .query(sqlQuery, [req.params.id, req.cookies.userId])
    .then(() => {
      res.redirect('/');
    })
    .catch((error) => {
      console.log('Delete query error', error.stack);
      res.status(503).send('Error');
    });
});

// Route to log out
app.get('/logout', (req, res) => {
  res.clearCookie('userFirstName');
  res.clearCookie('userLastName');
  res.clearCookie('userProfilePic');
  res.clearCookie('loggedInHash');
  res.clearCookie('userId');
  res.redirect('/login');
});

// Route to leave comment on message board

app.listen(3004);

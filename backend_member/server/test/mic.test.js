const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../app');

chai.config.includeStack = true;

describe('## Misc', () => {
  var token;

  // describe('# GET /auth/signin', () => {
  //   it('should return OK', (done) => {
  //     request(app)
  //       .post('/auth/signin')
  //       .send({
  //         username: 'allan.alzula@gmail.com',
  //         password: 'mednefits'
  //       })
  //       .set('Content-Type', 'application/json')
  //       .set('Accept', 'application/json')
  //       .expect(httpStatus.OK)
  //       .end(function (err, res) {
  //       console.log('res', res)
  //       if (err) {
  //         return done(err);
  //       }

  //       // res.body.should.to.have.property('token');
  //       // token = res.body.token;
  //       done();
  //     });
  //   });
  // });
  // before(function (done) {
  //   request(app)
  //     .post('/auth/signin')
  //     .send({
  //       username: 'allan.alzula@gmail.com',
  //       password: 'mednefits'
  //     })
  //     .end(function (err, res) {
  //       console.log('res', res)
  //       if (err) {
  //         return done(err);
  //       }

  //       res.body.should.to.have.property('token');
  //       token = res.body.token;
  //       done();
  //     });
  // });

  // describe('# GET /hr/get_hr_session', () => {
  //   it('should return OK', (done) => {
  //     request(app)
  //       .get('/hr/get_hr_session')
  //       .set('Authorization', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJocl9pZCI6IjVkNjUyNGE2Mjc5ZDk1Nzg4Y2E4OGE4OCIsImN1c3RvbWVyX2lkIjoiMTI2IiwidXNlcm5hbWUiOiJhbGxhbi5hbHp1bGFAZ21haWwuY29tIiwicm9sZSI6ImhyIiwiaWF0IjoxNTY2OTU3NjU5LCJleHAiOjE1Njk1NDk2NTl9.HpepyX0-Dfg5avMysqqohSTBPmU6qZICkRVKdXaPB9o")
  //       .expect(httpStatus.OK)
  //       .then((res) => {
  //         // expect(res.text).to.equal('OK');
  //         expect(res.status).to.equal(200)
  //         done();
  //       })
  //       .catch(done);
  //   });
  // });

  // describe('# GET /hr/get_plan_status', () => {
  //   it('should return OK', (done) => {
  //     request(app)
  //       .get('/hr/get_plan_status')
  //       .set('Authorization', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJocl9pZCI6IjVkNjUyNGE2Mjc5ZDk1Nzg4Y2E4OGE4OCIsImN1c3RvbWVyX2lkIjoiMTI2IiwidXNlcm5hbWUiOiJhbGxhbi5hbHp1bGFAZ21haWwuY29tIiwicm9sZSI6ImhyIiwiaWF0IjoxNTY2OTU3NjU5LCJleHAiOjE1Njk1NDk2NTl9.HpepyX0-Dfg5avMysqqohSTBPmU6qZICkRVKdXaPB9o")
  //       .expect(httpStatus.OK)
  //       .then((res) => {
  //         // expect(res.text).to.equal('OK');
  //         // expect(res.status).to.equal(200)
  //         done();
  //       })
  //       .catch(done);
  //   });
  // });

  describe('# GET /hr/employee_lists?page=1&limit=5&search=allan', () => {
    it('should return OK', (done) => {
      request(app)
        .get('/hr/employee_lists?page=1&limit=5')
        .set('Authorization', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJocl9pZCI6IjVkNjUyNGE2Mjc5ZDk1Nzg4Y2E4OGE4OCIsImN1c3RvbWVyX2lkIjoiMTI2IiwidXNlcm5hbWUiOiJhbGxhbi5hbHp1bGFAZ21haWwuY29tIiwicm9sZSI6ImhyIiwiaWF0IjoxNTY2OTU3NjU5LCJleHAiOjE1Njk1NDk2NTl9.HpepyX0-Dfg5avMysqqohSTBPmU6qZICkRVKdXaPB9o")
        .expect(httpStatus.OK)
        .then((res) => {
          // expect(res.text).to.equal('OK');
          // expect(res.status).to.equal(200)
          done();
        })
        .catch(done);
    });
  });

  // describe('# GET /api/404', () => {
  //   it('should return 404 status', (done) => {
  //     request(app)
  //       .get('/api/404')
  //       .expect(httpStatus.NOT_FOUND)
  //       .then((res) => {
  //         expect(res.body.message).to.equal('Not Found');
  //         done();
  //       })
  //       .catch(done);
  //   });
  // });

  // describe('# Error Handling', () => {
  //   it('should handle mongoose CastError - Cast to ObjectId failed', (done) => {
  //     request(app)
  //       .get('/api/users/56z787zzz67fc')
  //       .expect(httpStatus.INTERNAL_SERVER_ERROR)
  //       .then((res) => {
  //         expect(res.body.message).to.equal('Internal Server Error');
  //         done();
  //       })
  //       .catch(done);
  //   });

  //   it('should handle express validation error - username is required', (done) => {
  //     request(app)
  //       .post('/api/users')
  //       .send({
  //         mobileNumber: '1234567890'
  //       })
  //       .expect(httpStatus.BAD_REQUEST)
  //       .then((res) => {
  //         expect(res.body.message).to.equal('"username" is required');
  //         done();
  //       })
  //       .catch(done);
  //   });
  // });
});

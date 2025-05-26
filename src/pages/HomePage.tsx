import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { Users, Calendar, Award, Clock, Vote, FileText, Heart } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
              Welcome to Northwest Democrats
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light">
              Join us in making a difference in our community. Together, we can create positive change through grassroots activism and local engagement.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="font-heading">
                  Become a Member
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 border-white text-white font-heading">
                  Member Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              The Northwest Democrats are dedicated to promoting Democratic values, supporting progressive candidates, and engaging our community in the democratic process.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Vote className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Democratic Values</h3>
                <p className="text-gray-600">
                  Promoting progressive policies and democratic principles in our community.
                </p>
              </div>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Heart className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Community Action</h3>
                <p className="text-gray-600">
                  Taking direct action to improve our community and help our neighbors.
                </p>
              </div>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Civic Engagement</h3>
                <p className="text-gray-600">
                  Educating and empowering citizens to participate in democracy.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Get Involved Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Get Involved</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              There are many ways to make a difference with the Northwest Democrats.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Users className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Join Us</h3>
                <p className="text-gray-600 mb-4">
                  Become a member and help shape our community's future.
                </p>
                <Link to="/register">
                  <Button variant="outline" size="sm">Learn More</Button>
                </Link>
              </div>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Events</h3>
                <p className="text-gray-600 mb-4">
                  Attend meetings and special events in your area.
                </p>
                <a 
                  href="https://www.mobilize.us/nwdems/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">View Events</Button>
                </a>
              </div>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Clock className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Volunteer</h3>
                <p className="text-gray-600 mb-4">
                  Contribute your time and skills to make a difference.
                </p>
                <Link to="/volunteer">
                  <Button variant="outline" size="sm">Get Started</Button>
                </Link>
              </div>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center p-6">
                <div className="p-3 bg-primary-100 rounded-full mb-4">
                  <Award className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">Leadership</h3>
                <p className="text-gray-600 mb-4">
                  Take on leadership roles and help guide our organization.
                </p>
                <Link to="/volunteer">
                  <Button variant="outline" size="sm">Learn More</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:max-w-2xl">
              <h2 className="text-3xl font-heading font-bold mb-4">Ready to make a difference?</h2>
              <p className="text-xl text-primary-100 mb-6">
                Join the Northwest Democrats today and help us build a brighter future for our community.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="font-heading">
                  Join Now
                </Button>
              </Link>
            </div>
            <div className="mt-8 lg:mt-0">
              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-xl font-heading font-semibold mb-3">Next Meeting</h3>
                <p className="mb-2"><strong>Date:</strong> 4th Thursday of the month</p>
                <p className="mb-2"><strong>Time:</strong> Doors open at 6:30 PM, Meeting at 7:00 PM</p>
                <p className="mb-4"><strong>Location:</strong> DeLand Garden Club</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
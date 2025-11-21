import { requireSupabaseClient } from '../config/supabase.config';

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | null;
  created_at?: string;
  updated_at?: string;
}

export interface Subtopic {
  id: string;
  topic_id: string;
  title: string;
  description?: string;
  order_index: number;
  learning_objectives?: string[];
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | null;
  created_at?: string;
}

export interface CreateTopicDto {
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  estimated_hours?: number;
  week_number?: number;
}

export interface CreateSubtopicDto {
  topic_id: string;
  title: string;
  description?: string;
  order_index: number;
  learning_objectives?: string[];
}

class TopicModel {
  private readonly topicsTable = 'topics';
  private readonly subtopicsTable = 'subtopics';

  // ============= TOPICS =============

  async createTopic(topicData: CreateTopicDto): Promise<Topic> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.topicsTable)
      .insert([topicData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create topic: ${error.message}`);
    }

    return data;
  }

  async createTopicsFromSyllabus(courseId: string, syllabusItems: any[]): Promise<Topic[]> {
    const supabase = requireSupabaseClient();
    
    // Convert syllabus items to topic records
    const topicsToCreate = syllabusItems.map((item, index) => ({
      course_id: courseId,
      title: item.topic,
      order_index: index,
      bloom_level: item.bloom_level || null
    }));

    const { data, error } = await supabase
      .from(this.topicsTable)
      .insert(topicsToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create topics: ${error.message}`);
    }

    // Create subtopics for each topic
    for (let i = 0; i < data.length; i++) {
      const topic = data[i];
      const syllabusItem = syllabusItems[i];
      
      if (syllabusItem.subtopics && Array.isArray(syllabusItem.subtopics)) {
        // Handle both string arrays and object arrays with bloom_level
        const subtopicData = syllabusItem.subtopics.map((st: any) => 
          typeof st === 'string' 
            ? { title: st }
            : { title: st.subtopic || st.title, bloom_level: st.bloom_level }
        );
        await this.createSubtopicsForTopic(topic.id, subtopicData);
      }
    }

    return data;
  }

  async findTopicsByCourse(courseId: string): Promise<Topic[]> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.topicsTable)
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data;
  }

  async findTopicById(id: string): Promise<Topic | null> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.topicsTable)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.topicsTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update topic: ${error.message}`);
    }

    return data;
  }

  async deleteTopic(id: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from(this.topicsTable)
      .delete()
      .eq('id', id);

    return !error;
  }

  // ============= SUBTOPICS =============

  async createSubtopic(subtopicData: CreateSubtopicDto): Promise<Subtopic> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.subtopicsTable)
      .insert([subtopicData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create subtopic: ${error.message}`);
    }

    return data;
  }

  async createSubtopicsForTopic(
    topicId: string, 
    subtopicData: Array<{ title: string; bloom_level?: string } | string>
  ): Promise<Subtopic[]> {
    const supabase = requireSupabaseClient();
    
    const subtopicsToCreate = subtopicData.map((item, index) => ({
      topic_id: topicId,
      title: typeof item === 'string' ? item : item.title,
      order_index: index,
      bloom_level: typeof item === 'object' && item.bloom_level ? item.bloom_level : null
    }));

    const { data, error } = await supabase
      .from(this.subtopicsTable)
      .insert(subtopicsToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create subtopics: ${error.message}`);
    }

    return data || [];
  }

  async findSubtopicsByTopic(topicId: string): Promise<Subtopic[]> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.subtopicsTable)
      .select('*')
      .eq('topic_id', topicId)
      .order('order_index', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data;
  }

  async getTopicsWithSubtopics(courseId: string): Promise<any[]> {
    const topics = await this.findTopicsByCourse(courseId);
    
    const topicsWithSubtopics = await Promise.all(
      topics.map(async (topic) => {
        const subtopics = await this.findSubtopicsByTopic(topic.id);
        return {
          ...topic,
          subtopics,
        };
      })
    );

    return topicsWithSubtopics;
  }

  async deleteSubtopic(id: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from(this.subtopicsTable)
      .delete()
      .eq('id', id);

    return !error;
  }

  // ============= ANALYTICS =============

  async getTopicPerformanceForStudent(studentId: string, courseId: string): Promise<any[]> {
    const supabase = requireSupabaseClient();
    
    // Get all topics for the course
    const topics = await this.findTopicsByCourse(courseId);
    
    // Get performance data for each topic
    const topicPerformance = await Promise.all(
      topics.map(async (topic) => {
        const { data } = await supabase
          .from('student_topic_performance')
          .select('*')
          .eq('student_id', studentId)
          .eq('topic_id', topic.id)
          .single();

        return {
          topic: topic.title,
          topicId: topic.id,
          attempts: data?.attempts || 0,
          correctAnswers: data?.correct_answers || 0,
          accuracy: data?.attempts > 0 
            ? ((data.correct_answers / data.attempts) * 100).toFixed(1)
            : '0',
        };
      })
    );

    return topicPerformance;
  }

  async updateStudentTopicPerformance(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    subtopicId?: string
  ): Promise<void> {
    const supabase = requireSupabaseClient();
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('student_topic_performance')
      .select('*')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .eq('subtopic_id', subtopicId || null)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('student_topic_performance')
        .update({
          attempts: existing.attempts + 1,
          correct_answers: existing.correct_answers + (isCorrect ? 1 : 0),
          last_attempted_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('student_topic_performance')
        .insert([{
          student_id: studentId,
          topic_id: topicId,
          subtopic_id: subtopicId || null,
          attempts: 1,
          correct_answers: isCorrect ? 1 : 0,
          last_attempted_at: new Date().toISOString(),
        }]);
    }
  }
}

export default new TopicModel();

